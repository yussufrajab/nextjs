/**
 * Unit Tests for Password Expiration Utilities
 *
 * Testing password expiration, grace periods, and warning notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPasswordExpirationDays,
  calculatePasswordExpirationDate,
  isPasswordExpired,
  isInGracePeriod,
  getGracePeriodDaysRemaining,
  getDaysUntilExpiration,
  getWarningLevel,
  shouldSendWarning,
  getPasswordExpirationStatus,
  resetPasswordExpiration,
  PASSWORD_EXPIRATION_DAYS_ADMIN,
  PASSWORD_EXPIRATION_DAYS_STANDARD,
  PASSWORD_GRACE_PERIOD_DAYS,
  WARNING_LEVELS,
} from './password-expiration-utils';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      update: vi.fn(),
    },
  },
}));

// Import the mocked db
import { db } from '@/lib/db';

describe('password-expiration-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // Constants
  // =============================================================================

  describe('Constants', () => {
    it('should have correct PASSWORD_EXPIRATION_DAYS_ADMIN value', () => {
      expect(PASSWORD_EXPIRATION_DAYS_ADMIN).toBe(60);
    });

    it('should have correct PASSWORD_EXPIRATION_DAYS_STANDARD value', () => {
      expect(PASSWORD_EXPIRATION_DAYS_STANDARD).toBe(90);
    });

    it('should have correct PASSWORD_GRACE_PERIOD_DAYS value', () => {
      expect(PASSWORD_GRACE_PERIOD_DAYS).toBe(7);
    });

    it('should have correct WARNING_LEVELS values', () => {
      expect(WARNING_LEVELS.LEVEL_1).toBe(14);
      expect(WARNING_LEVELS.LEVEL_2).toBe(7);
      expect(WARNING_LEVELS.LEVEL_3).toBe(3);
      expect(WARNING_LEVELS.LEVEL_4).toBe(1);
    });
  });

  // =============================================================================
  // Password Expiration Days
  // =============================================================================

  describe('getPasswordExpirationDays', () => {
    it('should return 60 days for Admin role', () => {
      expect(getPasswordExpirationDays('Admin')).toBe(60);
    });

    it('should return 90 days for non-Admin roles', () => {
      expect(getPasswordExpirationDays('HRO')).toBe(90);
      expect(getPasswordExpirationDays('EMPLOYEE')).toBe(90);
      expect(getPasswordExpirationDays('HRMO')).toBe(90);
      expect(getPasswordExpirationDays('MANAGER')).toBe(90);
    });

    it('should be case-sensitive for Admin role', () => {
      expect(getPasswordExpirationDays('admin')).toBe(90); // lowercase 'admin' != 'Admin'
      expect(getPasswordExpirationDays('ADMIN')).toBe(90); // uppercase 'ADMIN' != 'Admin'
    });

    it('should handle empty string role', () => {
      expect(getPasswordExpirationDays('')).toBe(90);
    });
  });

  // =============================================================================
  // Calculate Expiration Date
  // =============================================================================

  describe('calculatePasswordExpirationDate', () => {
    it('should calculate expiration date 60 days ahead for Admin', () => {
      const startDate = new Date('2024-01-01');
      const expirationDate = calculatePasswordExpirationDate(startDate, 'Admin');
      const expectedDate = new Date('2024-03-01'); // 60 days from Jan 1, 2024

      expect(expirationDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should calculate expiration date 90 days ahead for standard users', () => {
      const startDate = new Date('2024-01-01');
      const expirationDate = calculatePasswordExpirationDate(startDate, 'HRO');
      const expectedDate = new Date('2024-03-31'); // 90 days from Jan 1, 2024

      expect(expirationDate.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should handle leap year correctly', () => {
      const startDate = new Date('2024-02-01'); // 2024 is a leap year
      const expirationDate = calculatePasswordExpirationDate(startDate, 'Admin');
      const daysDiff = Math.floor(
        (expirationDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBe(60);
    });

    it('should return a Date object', () => {
      const startDate = new Date('2024-01-01');
      const expirationDate = calculatePasswordExpirationDate(startDate, 'Admin');

      expect(expirationDate).toBeInstanceOf(Date);
    });

    it('should not modify the original start date', () => {
      const startDate = new Date('2024-01-01');
      const originalTime = startDate.getTime();

      calculatePasswordExpirationDate(startDate, 'Admin');

      expect(startDate.getTime()).toBe(originalTime);
    });
  });

  // =============================================================================
  // Password Expiration Check
  // =============================================================================

  describe('isPasswordExpired', () => {
    it('should return false if passwordExpiresAt is null', () => {
      expect(isPasswordExpired(null, null)).toBe(false);
    });

    it('should return true if password expired and no grace period', () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      expect(isPasswordExpired(pastDate, null)).toBe(true);
    });

    it('should return false if password not yet expired', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days future
      expect(isPasswordExpired(futureDate, null)).toBe(false);
    });

    it('should return false if within grace period', () => {
      const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // Expired 5 days ago
      const graceStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // Grace started 3 days ago

      expect(isPasswordExpired(expiredDate, graceStartDate)).toBe(false);
    });

    it('should return true if grace period ended', () => {
      const expiredDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // Expired 15 days ago
      const graceStartDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // Grace started 10 days ago (7 day grace ended 3 days ago)

      expect(isPasswordExpired(expiredDate, graceStartDate)).toBe(true);
    });

    it('should handle current time as expiration date', () => {
      const now = new Date();
      expect(isPasswordExpired(now, null)).toBe(false); // Not yet expired (technically at the boundary)
    });
  });

  // =============================================================================
  // Grace Period Check
  // =============================================================================

  describe('isInGracePeriod', () => {
    it('should return false if no grace period started', () => {
      const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      expect(isInGracePeriod(expiredDate, null)).toBe(false);
    });

    it('should return false if no expiration date', () => {
      const graceStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(isInGracePeriod(null, graceStartDate)).toBe(false);
    });

    it('should return true if within grace period', () => {
      const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const graceStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days into 7-day grace

      expect(isInGracePeriod(expiredDate, graceStartDate)).toBe(true);
    });

    it('should return false if grace period ended', () => {
      const expiredDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const graceStartDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // Grace ended 3 days ago

      expect(isInGracePeriod(expiredDate, graceStartDate)).toBe(false);
    });

    it('should return false if grace period not yet started', () => {
      const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const graceStartDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // Starts tomorrow

      expect(isInGracePeriod(expiredDate, graceStartDate)).toBe(false);
    });
  });

  // =============================================================================
  // Grace Period Days Remaining
  // =============================================================================

  describe('getGracePeriodDaysRemaining', () => {
    it('should return 0 if no grace period started', () => {
      expect(getGracePeriodDaysRemaining(null)).toBe(0);
    });

    it('should return remaining days in grace period', () => {
      const graceStartDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // Started 3 days ago
      const remaining = getGracePeriodDaysRemaining(graceStartDate);

      expect(remaining).toBeGreaterThanOrEqual(3);
      expect(remaining).toBeLessThanOrEqual(4); // 7 - 3 = 4 days remaining
    });

    it('should return 0 if grace period expired', () => {
      const graceStartDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // Started 10 days ago
      const remaining = getGracePeriodDaysRemaining(graceStartDate);

      expect(remaining).toBe(0);
    });

    it('should round up partial days', () => {
      const graceStartDate = new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000); // 6.5 days ago
      const remaining = getGracePeriodDaysRemaining(graceStartDate);

      expect(remaining).toBe(1); // Should round up
    });
  });

  // =============================================================================
  // Days Until Expiration
  // =============================================================================

  describe('getDaysUntilExpiration', () => {
    it('should return null if no expiration date', () => {
      expect(getDaysUntilExpiration(null)).toBeNull();
    });

    it('should return positive days for future expiration', () => {
      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days future
      const days = getDaysUntilExpiration(futureDate);

      expect(days).toBeGreaterThanOrEqual(14);
      expect(days).toBeLessThanOrEqual(15);
    });

    it('should return negative days for past expiration', () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const days = getDaysUntilExpiration(pastDate);

      expect(days).toBeLessThanOrEqual(-9);
    });

    it('should round up partial days', () => {
      const futureDate = new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000); // 1.5 days
      const days = getDaysUntilExpiration(futureDate);

      expect(days).toBe(2); // Should round up
    });
  });

  // =============================================================================
  // Warning Level
  // =============================================================================

  describe('getWarningLevel', () => {
    it('should return 0 for null days', () => {
      expect(getWarningLevel(null)).toBe(0);
    });

    it('should return 0 for more than 14 days', () => {
      expect(getWarningLevel(15)).toBe(0);
      expect(getWarningLevel(30)).toBe(0);
      expect(getWarningLevel(90)).toBe(0);
    });

    it('should return 1 for 14 days or less', () => {
      expect(getWarningLevel(14)).toBe(1);
      expect(getWarningLevel(10)).toBe(1);
      expect(getWarningLevel(8)).toBe(1);
    });

    it('should return 2 for 7 days or less', () => {
      expect(getWarningLevel(7)).toBe(2);
      expect(getWarningLevel(5)).toBe(2);
      expect(getWarningLevel(4)).toBe(2);
    });

    it('should return 3 for 3 days or less', () => {
      expect(getWarningLevel(3)).toBe(3);
      expect(getWarningLevel(2)).toBe(3);
    });

    it('should return 4 for 1 day or less', () => {
      expect(getWarningLevel(1)).toBe(4);
    });

    it('should return 5 for expired (0 or negative days)', () => {
      expect(getWarningLevel(0)).toBe(5);
      expect(getWarningLevel(-1)).toBe(5);
      expect(getWarningLevel(-10)).toBe(5);
    });
  });

  // =============================================================================
  // Should Send Warning
  // =============================================================================

  describe('shouldSendWarning', () => {
    it('should return true when warning level increases', () => {
      expect(shouldSendWarning(2, 1)).toBe(true);
      expect(shouldSendWarning(3, 2)).toBe(true);
      expect(shouldSendWarning(5, 4)).toBe(true);
    });

    it('should return false when warning level stays same', () => {
      expect(shouldSendWarning(2, 2)).toBe(false);
      expect(shouldSendWarning(3, 3)).toBe(false);
    });

    it('should return false when warning level decreases', () => {
      expect(shouldSendWarning(1, 2)).toBe(false);
      expect(shouldSendWarning(2, 3)).toBe(false);
    });

    it('should return true for first warning (null last level)', () => {
      expect(shouldSendWarning(1, null)).toBe(true);
      expect(shouldSendWarning(2, null)).toBe(true);
    });

    it('should return false for no warning level', () => {
      expect(shouldSendWarning(0, 0)).toBe(false);
      expect(shouldSendWarning(0, null)).toBe(false);
      expect(shouldSendWarning(0, 1)).toBe(false);
    });

    it('should handle transition from no warning to warning', () => {
      expect(shouldSendWarning(1, 0)).toBe(true);
      expect(shouldSendWarning(2, 0)).toBe(true);
    });
  });

  // =============================================================================
  // Get Password Expiration Status
  // =============================================================================

  describe('getPasswordExpirationStatus', () => {
    it('should return complete status for non-expired password', () => {
      const user = {
        role: 'HRO',
        passwordExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
        gracePeriodStartedAt: null,
        lastExpirationWarningLevel: 0,
      };

      const status = getPasswordExpirationStatus(user);

      expect(status.isExpired).toBe(false);
      expect(status.isInGracePeriod).toBe(false);
      expect(status.daysUntilExpiration).toBeGreaterThanOrEqual(29);
      expect(status.gracePeriodDaysRemaining).toBe(0);
      expect(status.warningLevel).toBe(0);
      expect(status.expirationPeriodDays).toBe(90);
    });

    it('should return status for password with warning', () => {
      const user = {
        role: 'Admin',
        passwordExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days future
        gracePeriodStartedAt: null,
        lastExpirationWarningLevel: 0,
      };

      const status = getPasswordExpirationStatus(user);

      expect(status.isExpired).toBe(false);
      expect(status.warningLevel).toBe(1); // 10 days = level 1 warning
      expect(status.expirationPeriodDays).toBe(60); // Admin gets 60 days
    });

    it('should return status for password in grace period', () => {
      const user = {
        role: 'HRO',
        passwordExpiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired 5 days ago
        gracePeriodStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Grace started 3 days ago
        lastExpirationWarningLevel: 3,
      };

      const status = getPasswordExpirationStatus(user);

      expect(status.isExpired).toBe(false);
      expect(status.isInGracePeriod).toBe(true);
      expect(status.gracePeriodDaysRemaining).toBeGreaterThan(0);
      expect(status.warningLevel).toBe(5); // Expired = level 5
    });

    it('should return status for fully expired password', () => {
      const user = {
        role: 'HRO',
        passwordExpiresAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Expired 15 days ago
        gracePeriodStartedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Grace ended 3 days ago
        lastExpirationWarningLevel: 5,
      };

      const status = getPasswordExpirationStatus(user);

      expect(status.isExpired).toBe(true);
      expect(status.isInGracePeriod).toBe(false);
      expect(status.gracePeriodDaysRemaining).toBe(0);
      expect(status.warningLevel).toBe(5);
    });

    it('should handle null expiration date', () => {
      const user = {
        role: 'HRO',
        passwordExpiresAt: null,
        gracePeriodStartedAt: null,
        lastExpirationWarningLevel: null,
      };

      const status = getPasswordExpirationStatus(user);

      expect(status.isExpired).toBe(false);
      expect(status.isInGracePeriod).toBe(false);
      expect(status.daysUntilExpiration).toBeNull();
      expect(status.warningLevel).toBe(0);
    });
  });

  // =============================================================================
  // Reset Password Expiration
  // =============================================================================

  describe('resetPasswordExpiration', () => {
    const userId = 'user-123';

    it('should reset expiration for Admin user', async () => {
      (db.user.update as any).mockResolvedValue({});

      await resetPasswordExpiration(userId, 'Admin');

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          passwordExpiresAt: expect.any(Date),
          lastExpirationWarningLevel: 0,
          gracePeriodStartedAt: null,
          lastPasswordChange: expect.any(Date),
        }),
      });

      // Verify the expiration date is ~60 days in the future
      const call = (db.user.update as any).mock.calls[0][0];
      const expiresAt = call.data.passwordExpiresAt;
      const now = new Date();
      const diffDays = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(59);
      expect(diffDays).toBeLessThanOrEqual(60);
    });

    it('should reset expiration for standard user', async () => {
      (db.user.update as any).mockResolvedValue({});

      await resetPasswordExpiration(userId, 'HRO');

      const call = (db.user.update as any).mock.calls[0][0];
      const expiresAt = call.data.passwordExpiresAt;
      const now = new Date();
      const diffDays = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(90);
    });

    it('should clear grace period', async () => {
      (db.user.update as any).mockResolvedValue({});

      await resetPasswordExpiration(userId, 'HRO');

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          gracePeriodStartedAt: null,
        }),
      });
    });

    it('should reset warning level to 0', async () => {
      (db.user.update as any).mockResolvedValue({});

      await resetPasswordExpiration(userId, 'HRO');

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          lastExpirationWarningLevel: 0,
        }),
      });
    });

    it('should set lastPasswordChange to current time', async () => {
      (db.user.update as any).mockResolvedValue({});

      const beforeCall = new Date();
      await resetPasswordExpiration(userId, 'HRO');
      const afterCall = new Date();

      const call = (db.user.update as any).mock.calls[0][0];
      const lastChange = call.data.lastPasswordChange;

      expect(lastChange.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(lastChange.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle password expiring exactly now', () => {
      const now = new Date();
      const days = getDaysUntilExpiration(now);

      expect(days).toBeLessThanOrEqual(1); // Rounds up, could be 0 or 1
    });

    it('should handle grace period starting exactly now', () => {
      const now = new Date();
      const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      const inGrace = isInGracePeriod(expiredDate, now);
      expect(inGrace).toBe(true);
    });

    it('should handle grace period ending exactly now', () => {
      const graceStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const inGrace = isInGracePeriod(expiredDate, graceStartDate);
      expect(inGrace).toBe(true); // Grace period includes the boundary time
    });

    it('should handle very large negative days until expiration', () => {
      const veryPastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      const days = getDaysUntilExpiration(veryPastDate);

      expect(days).toBeLessThan(-360);
      expect(getWarningLevel(days!)).toBe(5); // Still expired
    });
  });
});

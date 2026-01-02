/**
 * Unit Tests for Password Utilities
 *
 * Testing password hashing, validation, and security features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  comparePassword,
  validatePasswordComplexity,
  calculatePasswordStrength,
  getPasswordFeedback,
  checkPasswordHistory,
  isCommonPassword,
  generateTemporaryPassword,
  calculateTemporaryPasswordExpiry,
  calculateLockoutExpiry,
  isLockedOut,
  getRemainingLockoutTime,
  PASSWORD_MIN_LENGTH,
  PASSWORD_LOCKOUT_DURATION_MINUTES,
  TEMPORARY_PASSWORD_VALIDITY_DAYS,
} from './password-utils';

describe('password-utils', () => {
  // =============================================================================
  // Hash and Compare Functions
  // =============================================================================

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hashed = await hashPassword('');
      expect(hashed).toBeDefined();
      expect(hashed).toMatch(/^\$2[aby]\$\d+\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'CorrectPassword123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(password, hashed);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const hashed = await hashPassword('CorrectPassword123!');
      const isMatch = await comparePassword('WrongPassword123!', hashed);

      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hashed = await hashPassword('SomePassword123!');
      const isMatch = await comparePassword('', hashed);

      expect(isMatch).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const hashed = await hashPassword('Password123!');
      const isMatch = await comparePassword('password123!', hashed);

      expect(isMatch).toBe(false);
    });
  });

  // =============================================================================
  // Password Validation
  // =============================================================================

  describe('validatePasswordComplexity', () => {
    it('should accept password with uppercase letters', () => {
      expect(validatePasswordComplexity('ABCDEFGH')).toBe(true);
    });

    it('should accept password with lowercase letters', () => {
      expect(validatePasswordComplexity('abcdefgh')).toBe(true);
    });

    it('should accept password with numbers', () => {
      expect(validatePasswordComplexity('12345678')).toBe(true);
    });

    it('should accept password with special characters', () => {
      expect(validatePasswordComplexity('!@#$%^&*')).toBe(true);
    });

    it('should accept password with mixed characters', () => {
      expect(validatePasswordComplexity('Pass123!')).toBe(true);
    });

    it('should reject password shorter than minimum length', () => {
      expect(validatePasswordComplexity('Pass1!')).toBe(false);
      expect(validatePasswordComplexity('Ab1!')).toBe(false);
    });

    it('should reject empty password', () => {
      expect(validatePasswordComplexity('')).toBe(false);
    });

    it('should reject null/undefined password', () => {
      expect(validatePasswordComplexity(null as any)).toBe(false);
      expect(validatePasswordComplexity(undefined as any)).toBe(false);
    });

    it('should accept password exactly at minimum length', () => {
      const password = 'A'.repeat(PASSWORD_MIN_LENGTH);
      expect(validatePasswordComplexity(password)).toBe(true);
    });
  });

  // =============================================================================
  // Password Strength
  // =============================================================================

  describe('calculatePasswordStrength', () => {
    it('should rate very weak passwords as "weak"', () => {
      expect(calculatePasswordStrength('password')).toBe('weak');
      expect(calculatePasswordStrength('12345678')).toBe('weak');
    });

    it('should rate strong passwords higher', () => {
      const strength = calculatePasswordStrength('MyVeryStr0ng!P@ssw0rd');
      expect(['medium', 'strong', 'very-strong']).toContain(strength);
    });

    it('should return "weak" for empty password', () => {
      expect(calculatePasswordStrength('')).toBe('weak');
    });

    it('should rate random characters as stronger', () => {
      const randomPassword = 'xK9$mP2@qL5#nR8!';
      const strength = calculatePasswordStrength(randomPassword);
      expect(['strong', 'very-strong']).toContain(strength);
    });
  });

  describe('getPasswordFeedback', () => {
    it('should return feedback for empty password', () => {
      const feedback = getPasswordFeedback('');

      expect(feedback.score).toBe(0);
      expect(feedback.strength).toBe('weak');
      expect(feedback.feedback.warning).toContain('required');
    });

    it('should return score and strength for weak password', () => {
      const feedback = getPasswordFeedback('password');

      expect(feedback.score).toBeGreaterThanOrEqual(0);
      expect(feedback.strength).toBeDefined();
      expect(feedback.crackTimeDisplay).toBeDefined();
    });

    it('should provide suggestions for weak passwords', () => {
      const feedback = getPasswordFeedback('password123');

      expect(feedback.feedback.suggestions).toBeDefined();
      expect(Array.isArray(feedback.feedback.suggestions)).toBe(true);
    });

    it('should rate strong password higher', () => {
      const feedback = getPasswordFeedback('MyVeryStr0ng!P@ssw0rd2024');

      expect(feedback.score).toBeGreaterThanOrEqual(2);
      expect(['medium', 'strong', 'very-strong']).toContain(feedback.strength);
    });
  });

  // =============================================================================
  // Password History
  // =============================================================================

  describe('checkPasswordHistory', () => {
    it('should return false for empty history', async () => {
      const matches = await checkPasswordHistory('NewPassword123!', []);
      expect(matches).toBe(false);
    });

    it('should return true if password matches historical password', async () => {
      const password = 'OldPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword('DifferentPass123!');

      const matches = await checkPasswordHistory(password, [hash1, hash2]);
      expect(matches).toBe(true);
    });

    it('should return false if password does not match any historical password', async () => {
      const hash1 = await hashPassword('OldPassword123!');
      const hash2 = await hashPassword('AnotherOldPass123!');

      const matches = await checkPasswordHistory('NewPassword123!', [hash1, hash2]);
      expect(matches).toBe(false);
    });

    it('should handle null history', async () => {
      const matches = await checkPasswordHistory('NewPassword123!', null as any);
      expect(matches).toBe(false);
    });
  });

  describe('isCommonPassword', () => {
    it('should identify common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
      expect(isCommonPassword('qwerty')).toBe(true);
    });

    it('should return false for strong unique passwords', () => {
      const isCommon = isCommonPassword('xK9$mP2@qL5#nR8!wZ3%');
      expect(isCommon).toBe(false);
    });

    it('should return true for empty password', () => {
      expect(isCommonPassword('')).toBe(true);
    });
  });

  // =============================================================================
  // Temporary Password Generation
  // =============================================================================

  describe('generateTemporaryPassword', () => {
    it('should generate a password', () => {
      const password = generateTemporaryPassword();

      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThanOrEqual(8);
    });

    it('should generate password that meets complexity requirements', () => {
      const password = generateTemporaryPassword();
      expect(validatePasswordComplexity(password)).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateTemporaryPassword();
      const password2 = generateTemporaryPassword();
      const password3 = generateTemporaryPassword();

      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
      expect(password1).not.toBe(password3);
    });

    it('should generate password with mixed character types', () => {
      const password = generateTemporaryPassword();

      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[@$!%*?&#]/.test(password);

      // Should have multiple character types
      const typesCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
      expect(typesCount).toBeGreaterThanOrEqual(2);
    });
  });

  // =============================================================================
  // Date Calculations
  // =============================================================================

  describe('calculateTemporaryPasswordExpiry', () => {
    it('should calculate expiry date in the future', () => {
      const expiry = calculateTemporaryPasswordExpiry();
      const now = new Date();

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should set expiry exactly N days from now', () => {
      const expiry = calculateTemporaryPasswordExpiry();
      const now = new Date();
      const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(TEMPORARY_PASSWORD_VALIDITY_DAYS);
    });
  });

  describe('calculateLockoutExpiry', () => {
    it('should calculate lockout expiry in the future', () => {
      const lockoutExpiry = calculateLockoutExpiry();
      const now = new Date();

      expect(lockoutExpiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should set lockout for correct duration', () => {
      const lockoutExpiry = calculateLockoutExpiry();
      const now = new Date();
      const diffMinutes = Math.floor((lockoutExpiry.getTime() - now.getTime()) / (1000 * 60));

      expect(diffMinutes).toBe(PASSWORD_LOCKOUT_DURATION_MINUTES);
    });
  });

  // =============================================================================
  // Lockout Status
  // =============================================================================

  describe('isLockedOut', () => {
    it('should return false if lockoutUntil is null', () => {
      expect(isLockedOut(null)).toBe(false);
    });

    it('should return true if lockout time is in the future', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      expect(isLockedOut(futureDate)).toBe(true);
    });

    it('should return false if lockout time has passed', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(isLockedOut(pastDate)).toBe(false);
    });

    it('should return false for current time', () => {
      const now = new Date();
      expect(isLockedOut(now)).toBe(false);
    });
  });

  describe('getRemainingLockoutTime', () => {
    it('should return 0 if lockoutUntil is null', () => {
      expect(getRemainingLockoutTime(null)).toBe(0);
    });

    it('should return 0 if lockout has expired', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      expect(getRemainingLockoutTime(pastDate)).toBe(0);
    });

    it('should return remaining minutes for future lockout', () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const remaining = getRemainingLockoutTime(futureDate);

      expect(remaining).toBeGreaterThan(14);
      expect(remaining).toBeLessThanOrEqual(15);
    });

    it('should round up partial minutes', () => {
      const futureDate = new Date(Date.now() + 90 * 1000); // 1.5 minutes
      const remaining = getRemainingLockoutTime(futureDate);

      expect(remaining).toBe(2); // Should round up
    });
  });
});

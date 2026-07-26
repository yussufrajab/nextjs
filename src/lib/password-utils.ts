import zxcvbn from 'zxcvbn';
import { randomInt } from 'crypto';

// NOTE: Argon2id hashing (hashPassword / verifyPassword / comparePassword /
// checkPasswordHistory) lives in ./password-hash, which is server-only because
// it imports the native `argon2` addon. This module stays client-safe (pure
// complexity / strength / lockout math only) so it can be imported from client
// components without pulling native deps into the browser bundle.

// Constants
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_HISTORY_LENGTH = 5;
export const TEMPORARY_PASSWORD_VALIDITY_DAYS = 7;
export const MAX_PASSWORD_CHANGE_ATTEMPTS = 5;
export const PASSWORD_LOCKOUT_DURATION_MINUTES = 30;

// Password strength types
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  score: number; // 0-4 from zxcvbn
  strength: PasswordStrength;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimeDisplay: string;
}

/**
 * Validate password complexity requirements
 * Must be at least 12 characters and contain ALL FOUR of:
 * - Uppercase letter (A-Z)
 * - Lowercase letter (a-z)
 * - Number (0-9)
 * - Special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
export function validatePasswordComplexity(password: string): boolean {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&#^()_+\-=\[\]{}|;:,.<>?]/.test(password);

  // SECURITY: Require all four character classes
  const classCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  return classCount >= 4;
}

/**
 * Calculate password strength using zxcvbn
 * Returns strength level: weak, medium, strong, or very-strong
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';

  const result = zxcvbn(password);

  // Map zxcvbn score (0-4) to our strength levels
  switch (result.score) {
    case 0:
    case 1:
      return 'weak';
    case 2:
      return 'medium';
    case 3:
      return 'strong';
    case 4:
      return 'very-strong';
    default:
      return 'weak';
  }
}

/**
 * Get detailed password feedback from zxcvbn
 */
export function getPasswordFeedback(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      strength: 'weak',
      feedback: {
        warning: 'Password is required',
        suggestions: ['Enter a password'],
      },
      crackTimeDisplay: 'instant',
    };
  }

  const result = zxcvbn(password);
  const strength = calculatePasswordStrength(password);

  return {
    score: result.score,
    strength,
    feedback: {
      warning: result.feedback.warning || '',
      suggestions: result.feedback.suggestions || [],
    },
    crackTimeDisplay: String(
      result.crack_times_display.offline_slow_hashing_1e4_per_second
    ),
  };
}

/**
 * Check if password is a common/weak password using zxcvbn
 * Returns true if password is too common
 */
export function isCommonPassword(password: string): boolean {
  if (!password) return true;

  const result = zxcvbn(password);

  // Consider passwords with score 0 or 1 as "common"
  // These are very weak and easily guessable
  return result.score <= 1;
}

/**
 * Generate a secure random temporary password
 * Returns a password that meets complexity requirements
 *
 * SECURITY (Q6): uses the cryptographically-secure `crypto.randomInt` for all
 * character selection and a Fisher–Yates shuffle backed by the same CSPRNG.
 * `Math.random()` is NOT suitable for generating credentials.
 */
export function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&#';

  // Ensure at least one character from each category
  const chars: string[] = [
    uppercase[randomInt(uppercase.length)],
    lowercase[randomInt(lowercase.length)],
    numbers[randomInt(numbers.length)],
    special[randomInt(special.length)],
  ];

  // Fill remaining characters randomly from all categories
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = chars.length; i < 12; i++) {
    chars.push(allChars[randomInt(allChars.length)]);
  }

  // Fisher–Yates shuffle with a CSPRNG to avoid a predictable pattern
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Calculate when a temporary password expires
 */
export function calculateTemporaryPasswordExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + TEMPORARY_PASSWORD_VALIDITY_DAYS);
  return expiryDate;
}

/**
 * Calculate when password change lockout expires
 */
export function calculateLockoutExpiry(): Date {
  const lockoutDate = new Date();
  lockoutDate.setMinutes(
    lockoutDate.getMinutes() + PASSWORD_LOCKOUT_DURATION_MINUTES
  );
  return lockoutDate;
}

/**
 * Check if user is currently locked out
 */
export function isLockedOut(lockoutUntil: Date | null): boolean {
  if (!lockoutUntil) return false;
  return new Date() < new Date(lockoutUntil);
}

/**
 * Get remaining lockout time in minutes
 */
export function getRemainingLockoutTime(lockoutUntil: Date | null): number {
  if (!lockoutUntil) return 0;

  const now = new Date();
  const lockout = new Date(lockoutUntil);

  if (now >= lockout) return 0;

  const diffMs = lockout.getTime() - now.getTime();
  return Math.ceil(diffMs / 60000); // Convert to minutes
}

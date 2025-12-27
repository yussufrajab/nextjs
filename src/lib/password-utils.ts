import bcrypt from 'bcryptjs';
import zxcvbn from 'zxcvbn';

// Constants
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HISTORY_LENGTH = 3;
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
 * Must be at least 8 characters and contain at least ONE of:
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

  // Must have at least one of the character types
  return hasUppercase || hasLowercase || hasNumber || hasSpecial;
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
    crackTimeDisplay: String(result.crack_times_display.offline_slow_hashing_1e4_per_second),
  };
}

/**
 * Check if password matches any in history
 * Returns true if password matches any historical password
 */
export async function checkPasswordHistory(
  password: string,
  passwordHistory: string[]
): Promise<boolean> {
  if (!passwordHistory || passwordHistory.length === 0) {
    return false; // No history, password is OK
  }

  // Check against each historical password (they're stored as hashes)
  for (const historicalHash of passwordHistory) {
    const matches = await bcrypt.compare(password, historicalHash);
    if (matches) {
      return true; // Password matches history
    }
  }

  return false; // Password doesn't match any historical password
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
 */
export function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&#';

  // Ensure at least one character from each category
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining characters randomly from all categories
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to avoid predictable pattern
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
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

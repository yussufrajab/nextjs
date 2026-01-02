import { db } from '@/lib/db';

// Password expiration constants
export const PASSWORD_EXPIRATION_DAYS_ADMIN = 60;
export const PASSWORD_EXPIRATION_DAYS_STANDARD = 90;
export const PASSWORD_GRACE_PERIOD_DAYS = 7;

// Warning levels (days before expiration)
export const WARNING_LEVELS = {
  LEVEL_1: 14, // 14 days warning
  LEVEL_2: 7,  // 7 days warning
  LEVEL_3: 3,  // 3 days warning
  LEVEL_4: 1,  // 1 day warning
};

/**
 * Get password expiration period based on user role
 * Admins: 60 days, All others: 90 days
 */
export function getPasswordExpirationDays(role: string): number {
  return role === 'Admin' ? PASSWORD_EXPIRATION_DAYS_ADMIN : PASSWORD_EXPIRATION_DAYS_STANDARD;
}

/**
 * Calculate password expiration date from a given start date
 */
export function calculatePasswordExpirationDate(
  startDate: Date,
  role: string
): Date {
  const expirationDate = new Date(startDate);
  const expirationDays = getPasswordExpirationDays(role);
  expirationDate.setDate(expirationDate.getDate() + expirationDays);
  return expirationDate;
}

/**
 * Check if password is expired (beyond grace period)
 */
export function isPasswordExpired(
  passwordExpiresAt: Date | null,
  gracePeriodStartedAt: Date | null
): boolean {
  if (!passwordExpiresAt) return false;

  const now = new Date();

  // If within grace period
  if (gracePeriodStartedAt) {
    const graceEndDate = new Date(gracePeriodStartedAt);
    graceEndDate.setDate(graceEndDate.getDate() + PASSWORD_GRACE_PERIOD_DAYS);
    return now > graceEndDate;
  }

  // No grace period started yet, check if expiration date passed
  return now > passwordExpiresAt;
}

/**
 * Check if password is in grace period
 */
export function isInGracePeriod(
  passwordExpiresAt: Date | null,
  gracePeriodStartedAt: Date | null
): boolean {
  if (!passwordExpiresAt || !gracePeriodStartedAt) return false;

  const now = new Date();
  const graceEndDate = new Date(gracePeriodStartedAt);
  graceEndDate.setDate(graceEndDate.getDate() + PASSWORD_GRACE_PERIOD_DAYS);

  return now >= gracePeriodStartedAt && now <= graceEndDate;
}

/**
 * Get days remaining in grace period
 */
export function getGracePeriodDaysRemaining(
  gracePeriodStartedAt: Date | null
): number {
  if (!gracePeriodStartedAt) return 0;

  const now = new Date();
  const graceEndDate = new Date(gracePeriodStartedAt);
  graceEndDate.setDate(graceEndDate.getDate() + PASSWORD_GRACE_PERIOD_DAYS);

  const diffMs = graceEndDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return daysRemaining > 0 ? daysRemaining : 0;
}

/**
 * Get days until password expires
 */
export function getDaysUntilExpiration(
  passwordExpiresAt: Date | null
): number | null {
  if (!passwordExpiresAt) return null;

  const now = new Date();
  const diffMs = passwordExpiresAt.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine warning level based on days until expiration
 * Returns: 0 (no warning), 1 (14 days), 2 (7 days), 3 (3 days), 4 (1 day), 5 (expired)
 */
export function getWarningLevel(daysUntilExpiration: number | null): number {
  if (daysUntilExpiration === null) return 0;

  if (daysUntilExpiration <= 0) return 5; // Expired
  if (daysUntilExpiration <= 1) return 4; // 1 day
  if (daysUntilExpiration <= 3) return 3; // 3 days
  if (daysUntilExpiration <= 7) return 2; // 7 days
  if (daysUntilExpiration <= 14) return 1; // 14 days

  return 0; // No warning needed
}

/**
 * Check if user needs a new warning notification
 */
export function shouldSendWarning(
  currentWarningLevel: number,
  lastWarningLevel: number | null
): boolean {
  const lastLevel = lastWarningLevel || 0;
  return currentWarningLevel > lastLevel && currentWarningLevel > 0;
}

/**
 * Get password expiration status for a user
 */
export interface PasswordExpirationStatus {
  isExpired: boolean;
  isInGracePeriod: boolean;
  daysUntilExpiration: number | null;
  gracePeriodDaysRemaining: number;
  passwordExpiresAt: Date | null;
  gracePeriodStartedAt: Date | null;
  warningLevel: number;
  expirationPeriodDays: number;
}

export function getPasswordExpirationStatus(user: {
  role: string;
  passwordExpiresAt: Date | null;
  gracePeriodStartedAt: Date | null;
  lastExpirationWarningLevel?: number | null;
}): PasswordExpirationStatus {
  const daysUntilExpiration = getDaysUntilExpiration(user.passwordExpiresAt);
  const warningLevel = getWarningLevel(daysUntilExpiration);

  return {
    isExpired: isPasswordExpired(user.passwordExpiresAt, user.gracePeriodStartedAt),
    isInGracePeriod: isInGracePeriod(user.passwordExpiresAt, user.gracePeriodStartedAt),
    daysUntilExpiration,
    gracePeriodDaysRemaining: getGracePeriodDaysRemaining(user.gracePeriodStartedAt),
    passwordExpiresAt: user.passwordExpiresAt,
    gracePeriodStartedAt: user.gracePeriodStartedAt,
    warningLevel,
    expirationPeriodDays: getPasswordExpirationDays(user.role),
  };
}

/**
 * Reset password expiration for a user (called on password change)
 */
export async function resetPasswordExpiration(
  userId: string,
  role: string
): Promise<void> {
  const now = new Date();
  const expiresAt = calculatePasswordExpirationDate(now, role);

  await db.user.update({
    where: { id: userId },
    data: {
      passwordExpiresAt: expiresAt,
      lastExpirationWarningLevel: 0,
      gracePeriodStartedAt: null,
      lastPasswordChange: now,
    },
  });
}

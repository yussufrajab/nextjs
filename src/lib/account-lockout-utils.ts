import { db } from '@/lib/db';

// Account lockout constants
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const STANDARD_LOCKOUT_DURATION_MINUTES = 30;

// Lockout types
export enum LockoutType {
  STANDARD = 'standard', // Auto-unlocks after 30 minutes
  SECURITY = 'security', // Requires admin unlock
}

// Lockout reasons
export enum LockoutReason {
  FAILED_ATTEMPTS = 'failed_attempts',
  PASSWORD_EXPIRED = 'password_expired',
  ADMIN_LOCK = 'admin_lock',
  SECURITY_REVIEW = 'security_review',
}

/**
 * Calculate when a standard lockout expires (30 minutes from now)
 */
export function calculateStandardLockoutExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setMinutes(
    expiryDate.getMinutes() + STANDARD_LOCKOUT_DURATION_MINUTES
  );
  return expiryDate;
}

/**
 * Check if user account is currently locked
 */
export function isAccountLocked(user: {
  loginLockedUntil: Date | null;
  isManuallyLocked: boolean;
  loginLockoutType?: string | null;
}): boolean {
  const now = new Date();

  // Manual lock by admin - always locked until admin unlocks
  if (user.isManuallyLocked) {
    return true;
  }

  // Security lockout - requires admin unlock
  if (user.loginLockoutType === LockoutType.SECURITY) {
    return true;
  }

  // Standard lockout - check expiry time
  if (user.loginLockedUntil && now < new Date(user.loginLockedUntil)) {
    return true;
  }

  return false;
}

/**
 * Get remaining lockout time in minutes
 */
export function getRemainingLockoutTime(loginLockedUntil: Date | null): number {
  if (!loginLockedUntil) return 0;

  const now = new Date();
  const lockout = new Date(loginLockedUntil);

  if (now >= lockout) return 0;

  const diffMs = lockout.getTime() - now.getTime();
  return Math.ceil(diffMs / 60000); // Convert to minutes
}

/**
 * Determine lockout type based on failed attempts and context
 */
export function determineLockoutType(failedAttempts: number): LockoutType {
  // If excessive failed attempts (more than 10), use security lockout
  if (failedAttempts > 10) {
    return LockoutType.SECURITY;
  }

  // Standard lockout for 5-10 attempts
  return LockoutType.STANDARD;
}

/**
 * Increment failed login attempts and lock account if threshold reached
 */
export async function incrementFailedLoginAttempts(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{
  locked: boolean;
  lockoutType: LockoutType | null;
  remainingAttempts: number;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      failedLoginAttempts: true,
      loginLockedUntil: true,
      loginLockoutType: true,
      isManuallyLocked: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newAttemptCount = user.failedLoginAttempts + 1;
  const remainingAttempts = MAX_FAILED_LOGIN_ATTEMPTS - newAttemptCount;

  // Lock account if threshold reached or upgrade lockout if already locked
  if (newAttemptCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockoutType = determineLockoutType(newAttemptCount);
    const lockedUntil =
      lockoutType === LockoutType.STANDARD
        ? calculateStandardLockoutExpiry()
        : null; // Security lockout has no auto-unlock

    // Check if we're upgrading from STANDARD to SECURITY lockout
    const isUpgrading =
      user.loginLockoutType === LockoutType.STANDARD &&
      lockoutType === LockoutType.SECURITY;

    await db.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttemptCount,
        loginLockedUntil: lockedUntil,
        loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
        loginLockoutType: lockoutType,
        active: false, // Deactivate account when locked
        updatedAt: new Date(),
      },
    });

    // Log lockout event
    const { logAuditEvent, AuditEventCategory, AuditSeverity } =
      await import('@/lib/audit-logger');
    await logAuditEvent({
      eventType: isUpgrading ? 'ACCOUNT_LOCKOUT_UPGRADED' : 'ACCOUNT_LOCKED',
      eventCategory: AuditEventCategory.SECURITY,
      severity:
        lockoutType === LockoutType.SECURITY
          ? AuditSeverity.CRITICAL
          : AuditSeverity.WARNING,
      userId: user.id,
      username: user.username,
      userRole: null,
      ipAddress,
      userAgent,
      attemptedRoute: '/api/auth/login',
      requestMethod: 'POST',
      isAuthenticated: false,
      wasBlocked: true,
      blockReason: isUpgrading
        ? `Account lockout upgraded to SECURITY after ${newAttemptCount} failed login attempts`
        : `Account locked after ${newAttemptCount} failed login attempts`,
      additionalData: {
        failedAttempts: newAttemptCount,
        lockoutType,
        lockedUntil,
        reason: LockoutReason.FAILED_ATTEMPTS,
        isUpgrade: isUpgrading,
      },
    });

    return {
      locked: true,
      lockoutType,
      remainingAttempts: 0,
    };
  }

  // Update failed attempts count
  await db.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttemptCount,
      updatedAt: new Date(),
    },
  });

  return {
    locked: false,
    lockoutType: null,
    remainingAttempts: Math.max(0, remainingAttempts),
  };
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      // Clear standard lockout if it exists
      loginLockedUntil: null,
      loginLockoutReason: null,
      loginLockoutType: null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Lock account manually by administrator
 */
export async function lockAccountManually(
  userId: string,
  adminId: string,
  reason: string,
  notes?: string
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      isManuallyLocked: true,
      lockedBy: adminId,
      lockedAt: new Date(),
      loginLockoutReason: LockoutReason.ADMIN_LOCK,
      loginLockoutType: LockoutType.SECURITY,
      lockoutNotes: notes || reason,
      active: false,
      updatedAt: new Date(),
    },
  });

  // Log admin lock event
  const { logAuditEvent, AuditEventCategory, AuditSeverity } =
    await import('@/lib/audit-logger');
  const [user, admin] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { username: true } }),
    db.user.findUnique({
      where: { id: adminId },
      select: { username: true, role: true },
    }),
  ]);

  await logAuditEvent({
    eventType: 'ADMIN_ACCOUNT_LOCK',
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.WARNING,
    userId: adminId,
    username: admin?.username || 'unknown',
    userRole: admin?.role || null,
    attemptedRoute: '/api/admin/lock-account',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      targetUserId: userId,
      targetUsername: user?.username,
      reason,
      notes,
    },
  });
}

/**
 * Unlock account by administrator
 */
export async function unlockAccount(
  userId: string,
  adminId: string,
  verificationNotes: string
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      failedLoginAttempts: true,
      loginLockoutReason: true,
      isManuallyLocked: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await db.user.update({
    where: { id: userId },
    data: {
      isManuallyLocked: false,
      lockedBy: null,
      lockedAt: null,
      loginLockedUntil: null,
      loginLockoutReason: null,
      loginLockoutType: null,
      lockoutNotes: null,
      failedLoginAttempts: 0, // Reset failed attempts on unlock
      active: true, // Reactivate account
      updatedAt: new Date(),
    },
  });

  // Log unlock event
  const { logAuditEvent, AuditEventCategory, AuditSeverity } =
    await import('@/lib/audit-logger');
  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: { username: true, role: true },
  });

  await logAuditEvent({
    eventType: 'ADMIN_ACCOUNT_UNLOCK',
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.INFO,
    userId: adminId,
    username: admin?.username || 'unknown',
    userRole: admin?.role || null,
    attemptedRoute: '/api/admin/unlock-account',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      targetUserId: userId,
      targetUsername: user.username,
      previousReason: user.loginLockoutReason,
      failedAttempts: user.failedLoginAttempts,
      verificationNotes,
    },
  });
}

/**
 * Get account lockout status
 */
export interface AccountLockoutStatus {
  isLocked: boolean;
  lockoutType: LockoutType | null;
  lockoutReason: LockoutReason | null;
  lockedUntil: Date | null;
  remainingMinutes: number;
  failedAttempts: number;
  isManuallyLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockoutNotes: string | null;
  canAutoUnlock: boolean;
}

export function getAccountLockoutStatus(user: {
  failedLoginAttempts: number;
  loginLockedUntil: Date | null;
  loginLockoutReason: string | null;
  loginLockoutType: string | null;
  isManuallyLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockoutNotes: string | null;
}): AccountLockoutStatus {
  const isLocked = isAccountLocked(user);
  const remainingMinutes = getRemainingLockoutTime(user.loginLockedUntil);
  const canAutoUnlock =
    !user.isManuallyLocked && user.loginLockoutType === LockoutType.STANDARD;

  return {
    isLocked,
    lockoutType: user.loginLockoutType as LockoutType | null,
    lockoutReason: user.loginLockoutReason as LockoutReason | null,
    lockedUntil: user.loginLockedUntil,
    remainingMinutes,
    failedAttempts: user.failedLoginAttempts,
    isManuallyLocked: user.isManuallyLocked,
    lockedBy: user.lockedBy,
    lockedAt: user.lockedAt,
    lockoutNotes: user.lockoutNotes,
    canAutoUnlock,
  };
}

/**
 * Auto-unlock accounts with expired standard lockouts
 * Should be called periodically (e.g., on login attempt or via cron)
 */
export async function autoUnlockExpiredAccounts(): Promise<number> {
  const now = new Date();

  // Find accounts with expired standard lockouts
  const result = await db.user.updateMany({
    where: {
      active: false,
      isManuallyLocked: false,
      loginLockoutType: LockoutType.STANDARD,
      loginLockedUntil: {
        lt: now,
      },
    },
    data: {
      active: true,
      loginLockedUntil: null,
      loginLockoutReason: null,
      loginLockoutType: null,
      failedLoginAttempts: 0,
      updatedAt: now,
    },
  });

  return result.count;
}

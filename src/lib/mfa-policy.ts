import { db } from '@/lib/db';
import { authLogger } from '@/lib/logger';

/**
 * System-wide MFA enforcement policy.
 *
 * When `mfaEnabled` is true (the default), every user MUST complete MFA
 * (OTP / magic link) before login is granted. When false, the MFA gate is
 * skipped and users log in with username + password only.
 *
 * The setting is stored as a single row in `SystemSettings` keyed by
 * MFA_SETTINGS_KEY. Reads fail-open to `true` (MFA required) so that a DB
 * error never silently weakens authentication.
 */

export const MFA_SETTINGS_KEY = 'mfa_enabled';

/**
 * Returns true when MFA is required for all logins. Defaults to true.
 * Fail-open is to the SECURE state (MFA required) — a transient DB failure
 * must not downgrade authentication.
 */
export async function isMfaEnabled(): Promise<boolean> {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: MFA_SETTINGS_KEY },
    });
    if (!setting) return true; // default: MFA required
    return setting.value === 'true';
  } catch (error) {
    authLogger.error({ err: error }, 'Failed to read MFA policy — defaulting to MFA required');
    return true; // fail-open: secure
  }
}

/**
 * Persist the MFA-enabled policy. Used by the admin settings endpoint.
 */
export async function setMfaEnabled(enabled: boolean): Promise<void> {
  await db.systemSettings.upsert({
    where: { key: MFA_SETTINGS_KEY },
    update: { value: String(enabled), updatedAt: new Date() },
    create: {
      id: `setting_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      key: MFA_SETTINGS_KEY,
      value: String(enabled),
      updatedAt: new Date(),
    },
  });
}
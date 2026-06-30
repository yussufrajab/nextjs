import { db } from '@/lib/db';

/**
 * UI-safe payload returned by GET /api/auth/me and the session endpoint.
 *
 * Deliberately EXCLUDES: password, passwordHistory, failedPasswordChangeAttempts,
 * passwordChangeLockoutUntil, loginLocked*, lockoutNotes, passwordExpiresAt, etc.
 * Those fields must never reach the browser.
 */
export interface MePayload {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
  employeeId: string | null;
  institutionId: string | null;
  institutionName: string | null;
  mustChangePassword: boolean;
  isTemporaryPassword: boolean;
  temporaryPasswordExpiry: string | null;
  lastPasswordChange: string | null;
}

function toISO(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

/**
 * Fetch the UI-safe user payload for /auth/me. Returns null if the user does
 * not exist. Performs its own DB lookup with an explicit safe `select` so no
 * password column is ever read.
 */
export async function getMePayload(userId: string): Promise<MePayload | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      employeeId: true,
      institutionId: true,
      isTemporaryPassword: true,
      temporaryPasswordExpiry: true,
      mustChangePassword: true,
      lastPasswordChange: true,
    },
  });

  if (!user) return null;

  let institutionName: string | null = null;
  if (user.institutionId) {
    const institution = await db.institution.findUnique({
      where: { id: user.institutionId },
      select: { name: true },
    });
    institutionName = institution?.name ?? null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    employeeId: user.employeeId ?? null,
    institutionId: user.institutionId ?? null,
    institutionName,
    mustChangePassword: user.mustChangePassword ?? false,
    isTemporaryPassword: user.isTemporaryPassword ?? false,
    temporaryPasswordExpiry: toISO(user.temporaryPasswordExpiry),
    lastPasswordChange: toISO(user.lastPasswordChange),
  };
}
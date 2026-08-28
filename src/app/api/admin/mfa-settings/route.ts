import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { isMfaEnabled, setMfaEnabled } from '@/lib/mfa-policy';
import { terminateAllSessions } from '@/lib/session-manager';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { logConfigChange, getClientIp } from '@/lib/audit-logger';
/**
 * GET - Read the system-wide MFA enforcement policy (Admin only).
 *
 * Returns `{ enabled: boolean }`. `enabled === true` means every user must
 * complete MFA to log in; `false` means password-only login is permitted.
 */
export const GET = wrapHandler(withAuth(async () => {
  const enabled = await isMfaEnabled();
  return NextResponse.json({ success: true, data: { enabled } });
}, { allowedRoles: ['Admin'] }), 'admin-mfa-settings');

/**
 * Body: `{ enabled: boolean }`. The change takes effect immediately for all
 * subsequent login attempts AND terminates every existing session, forcing
 * all users to re-authenticate under the new policy. An audit event
 * (SYSTEM_SETTING_CHANGED) records the transition and the session count.
 */
export const PUT = wrapHandler(withAuth(async (request: Request, { auth }) => {
  const body = await request.json();
  const { enabled } = body as { enabled?: unknown };

  if (typeof enabled !== 'boolean') {
    return NextResponse.json(
      { success: false, message: '`enabled` must be a boolean.' },
      { status: 400 }
    );
  }

  const previousEnabled = await isMfaEnabled();
  if (previousEnabled === enabled) {
    return NextResponse.json({
      success: true,
      message: `MFA is already ${enabled ? 'enabled' : 'disabled'}.`,
      data: { enabled },
    });
  }

  await setMfaEnabled(enabled);

  // Force every OTHER user to re-authenticate under the new policy. The
  // admin's own sessions are preserved so they aren't kicked out mid-change.
  const terminatedSessions = await terminateAllSessions(auth.userId);

  await logConfigChange({
    configKey: 'MFA_ENABLED',
    previousValue: String(previousEnabled),
    newValue: String(enabled),
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request.headers),
    additionalData: {
      description: enabled
        ? 'MFA enforcement enabled — all users must complete MFA to log in.'
        : 'MFA enforcement disabled — users may log in with password only.',
      terminatedSessions,
    },
  }).catch((err) => {
    logger.error({ err }, 'Failed to write MFA_ENABLED audit event');
  });

  return NextResponse.json({
    success: true,
    message: `MFA has been ${enabled ? 'enabled' : 'disabled'} successfully. ${terminatedSessions} session(s) terminated — all users must log in again.`,
    data: { enabled, terminatedSessions },
  });
}, { allowedRoles: ['Admin'] }), 'admin-mfa-settings');
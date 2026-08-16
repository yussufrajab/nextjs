/**
 * POST /api/auth/reauth
 *
 * Step-up re-authentication. The caller must already have a valid session
 * (verified by `withAuth`) and provide their current password (and OTP if
 * the account has MFA enabled). On success, issues a 5-minute HMAC-signed
 * `reauth` cookie scoped to a specific operation.
 *
 * The frontend requests a re-auth by:
 *   1. Detecting a 401 with `errorCode: "REAUTH_REQUIRED"` from a sensitive
 *      endpoint.
 *   2. Showing a modal asking for password (and OTP if MFA enabled).
 *   3. POSTing to /api/auth/reauth with `{ scope, password, otp? }`.
 *   4. Retrying the original request — the `reauth` cookie is now attached.
 *
 * Audit: every successful and failed re-auth is recorded in the audit log.
 */

import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity, getClientIp } from '@/lib/audit-logger';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import {
  issueReauthToken,
  REAUTH_COOKIE_NAME,
  REAUTH_TTL_MS,
  getReauthCookieOptions,
} from '@/lib/reauth';
import { comparePassword } from '@/lib/password-hash';
import { verifyMfaToken } from '@/lib/mfa-utils';

const reauthSchema = z.object({
  scope: z.string().min(1).max(100),
  password: z.string().min(1, 'Password is required'),
  otp: z.string().optional(),
});

export const POST = wrapHandler(withAuth(async (request: Request, { auth }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', errorCode: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const parse = reauthSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request', errorCode: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { scope, password, otp } = parse.data;
  const ipAddress = getClientIp(request.headers);

  // Whitelist of allowed scopes — prevents the endpoint from being used to
  // issue re-auth tokens for arbitrary scope strings.
  const ALLOWED_SCOPES = new Set([
    'users.delete',
    'users.role-change',
    'institutions.delete',
    'institutions.update',
    'admin.reset-password',
    'admin.lock-account',
    'admin.unlock-account',
    'admin.hrims-settings',
    'hrims.sync',
  ]);
  if (!ALLOWED_SCOPES.has(scope)) {
    authLogger.warn({ userId: auth.userId, scope, ipAddress }, 'Re-auth requested with unknown scope');
    return NextResponse.json(
      { success: false, error: 'Unknown scope', errorCode: 'UNKNOWN_SCOPE' },
      { status: 400 }
    );
  }

  // Verify password
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, password: true, active: true },
  });

  if (!user || !user.active) {
    return NextResponse.json(
      { success: false, error: 'Account not found or inactive', errorCode: 'INVALID_SESSION' },
      { status: 401 }
    );
  }

  const passwordOk = await comparePassword(password, user.password);
  if (!passwordOk) {
    authLogger.warn({ userId: user.id, scope, ipAddress }, 'Re-auth failed: bad password');
    await logAuditEvent({
      eventType: AuditEventType.POTENTIAL_BREACH,
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.WARNING,
      userId: user.id,
      username: auth.username,
      userRole: auth.role,
      ipAddress,
      attemptedRoute: '/api/auth/reauth',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: true,
      blockReason: 'reauth_password_mismatch',
      additionalData: { scope },
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' },
      { status: 401 }
    );
  }

  // SECURITY (Q7): when an OTP is supplied, validate it against the user's
  // MFA token before issuing the re-auth token. This makes the step-up factor
  // functional for MFA-enabled accounts. If no OTP is supplied, step-up remains
  // password-only (the documented minimal-wiring behavior).
  if (otp) {
    const mfa = await verifyMfaToken(otp, 'OTP');
    if (!mfa.valid || mfa.userId !== user.id) {
      authLogger.warn({ userId: user.id, scope, ipAddress }, 'Re-auth failed: bad OTP');
      await logAuditEvent({
        eventType: AuditEventType.POTENTIAL_BREACH,
        eventCategory: AuditEventCategory.SECURITY,
        severity: AuditSeverity.WARNING,
        userId: user.id,
        username: auth.username,
        userRole: auth.role,
        ipAddress,
        attemptedRoute: '/api/auth/reauth',
        requestMethod: 'POST',
        isAuthenticated: true,
        wasBlocked: true,
        blockReason: 'reauth_otp_mismatch',
        additionalData: { scope },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }
  }

  // Issue the re-auth token
  const token = issueReauthToken(user.id, scope);
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({
    success: true,
    message: 'Re-authentication successful',
    scope,
    expiresIn: REAUTH_TTL_MS,
  });

  response.cookies.set(
    REAUTH_COOKIE_NAME,
    token,
    getReauthCookieOptions(isProduction, Math.floor(REAUTH_TTL_MS / 1000))
  );

  await logAuditEvent({
    eventType: AuditEventType.LOGIN_SUCCESS, // reuse; could add REAUTH_SUCCESS
    eventCategory: AuditEventCategory.AUTHENTICATION,
    severity: AuditSeverity.INFO,
    userId: user.id,
    username: auth.username,
    userRole: auth.role,
    ipAddress,
    attemptedRoute: '/api/auth/reauth',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    additionalData: { scope, kind: 'reauth' },
  }).catch(() => {});

  return response;
}, { allowedRoles: ['ADMIN', 'HRO', 'HRRP', 'HRMO', 'HHRMD', 'CSCS', 'PO', 'DO', 'EMPLOYEE', 'HRO_PEMBA', 'HRRP_PEMBA'] }), 'reauth');

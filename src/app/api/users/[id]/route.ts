import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import {
  logUserAction,
  logAuditEvent,
  AuditEventType,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { terminateAllUserSessions } from '@/lib/session-manager';
import { authLogger } from '@/lib/logger';
import {
  isPrivilegeEscalation,
  isHighPrivilegeRole,
  detectEscalationBurst,
} from '@/lib/role-privilege';
import {
  validatePasswordComplexity,
  isCommonPassword,
  calculateTemporaryPasswordExpiry,
  PASSWORD_MIN_LENGTH,
} from '@/lib/password-utils';
import { hashPassword } from '@/lib/password-hash';

// Safe fields that any admin can update on another user's profile.
const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  // SECURITY: email must be a valid email address. Empty string is rejected
  // to prevent accidental clearing of the MFA channel during profile updates.
  // To remove an email, an admin must use a dedicated endpoint (not exposed).
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .optional(),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be exactly 10 digits.')
    .max(10, 'Phone number must be exactly 10 digits.')
    .regex(/^\d{10}$/, 'Phone number must contain only digits.')
    .optional(),
});

// SECURITY: This endpoint is Admin-only (enforced by withAuth below).
// Sensitive fields like role, institutionId, and active are included here
// because admins legitimately need to manage them. Password is OPTIONAL on
// edits -- when omitted, the user's password is left untouched; when supplied,
// it is validated, hashed, and installed as a new temporary password the user
// must change on next login (mirroring /api/admin/reset-password). Self
// password-set is blocked -- an admin must use /api/auth/change-password for
// their own account. Self-role-change is blocked below to prevent
// escalation/demotion.
const adminUpdateSchema = profileUpdateSchema.extend({
  role: z.string().optional(),
  institutionId: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().optional(),
});

export const PUT = wrapHandler(withAuth(async (
  req: Request,
  { auth }: { auth: any }
) => {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop()!;
  try {
    const body = await req.json();
    const validatedData = adminUpdateSchema.parse(body);

    // Step-up re-authentication: changing a user's role or institution, or
    // setting a new password, is a Tier-1 sensitive action (privilege
    // escalation / cross-institution movement / account takeover). Profile-only
    // edits do not require re-auth.
    if (
      validatedData.role !== undefined ||
      validatedData.institutionId !== undefined ||
      validatedData.password !== undefined
    ) {
      const denied = requireReauth(req, 'users.role-change', auth);
      if (denied) return denied;
    }

    // Prevent admins from changing their own role (self-escalation or self-demotion).
    // SECURITY (Req 26.2): a self-role-change is the canonical privilege-escalation
    // attack. Block it AND log a CRITICAL POTENTIAL_BREACH so the SOC sees the
    // attempt — a silent 403 would leave no audit trail for an insider probing
    // the endpoint.
    if (validatedData.role && id === auth.userId) {
      await logAuditEvent({
        eventType: AuditEventType.POTENTIAL_BREACH,
        eventCategory: AuditEventCategory.SECURITY,
        severity: AuditSeverity.CRITICAL,
        userId: auth.userId,
        username: auth.username,
        userRole: auth.role,
        ipAddress: getClientIp(req.headers),
        attemptedRoute: `/api/users/${id}`,
        requestMethod: 'PUT',
        isAuthenticated: true,
        wasBlocked: true,
        blockReason: 'SELF_ROLE_CHANGE_BLOCKED',
        additionalData: {
          targetUserId: id,
          previousRole: auth.role,
          attemptedNewRole: validatedData.role,
          privilegeEscalation: true,
          selfRoleChange: true,
        },
      }).catch(() => {});
      return new NextResponse(
        'Cannot change your own role. Ask another admin.',
        { status: 403 }
      );
    }

    // ------------------------------------------------------------------
    // Optional password change (admin edits user).
    //
    // The password field is OPTIONAL: when omitted or empty, the user's
    // existing password is left untouched. When supplied, it is validated
    // against the same complexity / common-password rules as the dedicated
    // reset-password endpoint, hashed, and installed as a NEW temporary
    // password the target must change on next login. This mirrors
    // /api/admin/reset-password so the security posture is identical
    // regardless of which admin path sets the password.
    // ------------------------------------------------------------------
    const updateData: any = { ...validatedData };
    let passwordChanged = false;
    if (validatedData.password !== undefined && validatedData.password !== '') {
      // SECURITY: block self password-set through this admin path. An admin
      // must use /api/auth/change-password for their own account, which
      // verifies the current password and enforces password history.
      if (id === auth.userId) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Cannot set your own password through this admin path. Use the change-password endpoint.',
          },
          { status: 403 }
        );
      }

      const newPlain = validatedData.password;

      if (!validatePasswordComplexity(newPlain)) {
        return NextResponse.json(
          {
            success: false,
            message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain an uppercase letter, lowercase letter, number, and special character.`,
          },
          { status: 400 }
        );
      }

      if (isCommonPassword(newPlain)) {
        return NextResponse.json(
          {
            success: false,
            message:
              'This password is too common and easily guessable. Please choose a stronger password.',
          },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPlain);
      updateData.password = hashedPassword;
      updateData.isTemporaryPassword = true;
      updateData.temporaryPasswordExpiry = calculateTemporaryPasswordExpiry();
      updateData.mustChangePassword = true;
      updateData.failedPasswordChangeAttempts = 0;
      updateData.passwordChangeLockoutUntil = null;
      updateData.passwordExpiresAt = null;
      updateData.lastExpirationWarningLevel = 0;
      updateData.gracePeriodStartedAt = null;
      updateData.lastPasswordChange = new Date();
      passwordChanged = true;
    } else {
      // Never persist a plaintext/empty password field — strip it so the
      // Prisma update leaves the existing hash untouched.
      delete updateData.password;
    }

    // If activating a user, clear all lockout fields
    if (validatedData.active === true) {
      updateData.isManuallyLocked = false;
      updateData.lockedBy = null;
      updateData.lockedAt = null;
      updateData.loginLockedUntil = null;
      updateData.loginLockoutReason = null;
      updateData.loginLockoutType = null;
      updateData.lockoutNotes = null;
      updateData.failedLoginAttempts = 0;
    }

    // GAP-M3/M4: capture the previous role + institution BEFORE the update so
    // the audit row records the previous/new diff for forensic attribution of
    // privilege-escalation and cross-institution moves.
    const previousUser = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, institutionId: true, username: true },
    });

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        active: true,
        Institution: { select: { name: true } },
      },
    });

    // Generate mock phone number if not present
    const generateMockPhoneNumber = (userId: string): string => {
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const baseNumber = Math.abs(hash) % 100000000;
      return `07${baseNumber.toString().padStart(8, '0')}`;
    };

    const response = {
      ...updatedUser,
      phoneNumber:
        updatedUser.phoneNumber || generateMockPhoneNumber(updatedUser.id),
      isMockPhoneNumber: !updatedUser.phoneNumber,
      Institution: updatedUser.Institution?.name,
    };

    // Audit log: user updated
    // Derive the actor's identity from the signed session (authoritative),
    // not the forgeable auth-storage cookie.
    const roleChanged =
      validatedData.role !== undefined &&
      previousUser?.role !== validatedData.role;
    const institutionChanged =
      validatedData.institutionId !== undefined &&
      previousUser?.institutionId !== validatedData.institutionId;

    // SECURITY (Req 26.2): classify the role change as a privilege escalation
    // (strict rank increase) and flag it on the USER_UPDATED audit row so an
    // unusual run of escalations can be detected from the audit trail. The
    // CRITICAL POTENTIAL_BREACH alert is emitted below for high-privilege
    // escalations (→ Admin/HHRMD/CSCS) or when this change is part of a burst.
    const privilegeEscalation =
      roleChanged && isPrivilegeEscalation(previousUser?.role, updatedUser.role);
    const highPrivilegeEscalation =
      privilegeEscalation && isHighPrivilegeRole(updatedUser.role);

    await logUserAction({
      action: 'UPDATED',
      targetUserId: updatedUser.id,
      targetUsername: updatedUser.username,
      performedById: auth.userId,
      performedByUsername: auth.username,
      performedByRole: auth.role,
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
      additionalData: {
        previousRole: previousUser?.role,
        newRole: updatedUser.role,
        roleChanged,
        privilegeEscalation,
        previousInstitutionId: previousUser?.institutionId,
        newInstitutionId: validatedData.institutionId ?? previousUser?.institutionId,
        institutionChanged,
        passwordChanged,
      },
    }).catch(() => {});

    // SECURITY (Req 26.2): privilege-escalation detection & alerting. On a
    // role change that escalates privilege, emit a CRITICAL POTENTIAL_BREACH
    // via the existing dispatchSecurityAlert pipeline (already wired into
    // logAuditEvent). Two triggers:
    //   1. The new role is a high-privilege tier (Admin/HHRMD/CSCS) — a single
    //      such escalation pages the SOC immediately.
    //   2. An unusual run of escalations within a window (burst) — catches a
    //      distributed/slow accrual of privilege that no single change would
    //      flag. detectEscalationBurst reads prior USER_UPDATED rows carrying
    //      the privilegeEscalation flag (set above).
    // Lateral moves and demotions (no rank increase) emit no alert.
    if (privilegeEscalation) {
      const burst = await detectEscalationBurst().catch(() => null);
      if (highPrivilegeEscalation || burst?.isBurst) {
        await logAuditEvent({
          eventType: AuditEventType.POTENTIAL_BREACH,
          eventCategory: AuditEventCategory.SECURITY,
          severity: AuditSeverity.CRITICAL,
          userId: auth.userId,
          username: auth.username,
          userRole: auth.role,
          ipAddress: getClientIp(req.headers),
          attemptedRoute: `/api/users/${id}`,
          requestMethod: 'PUT',
          isAuthenticated: true,
          wasBlocked: false,
          blockReason: null,
          additionalData: {
            targetUserId: updatedUser.id,
            targetUsername: updatedUser.username,
            previousRole: previousUser?.role ?? null,
            newRole: updatedUser.role,
            privilegeEscalation: true,
            highPrivilegeEscalation,
            burst: burst
              ? {
                  count: burst.count,
                  threshold: burst.threshold,
                  windowSeconds: burst.windowSeconds,
                  isBurst: burst.isBurst,
                }
              : null,
          },
        }).catch(() => {});
      }
    }
    // SECURITY: when the admin set a new password, emit a dedicated
    // ADMIN_PASSWORD_RESET audit event (mirroring /api/admin/reset-password)
    // so password changes through this path are individually attributable in
    // the audit trail, not buried inside a generic USER_UPDATED row.
    if (passwordChanged) {
      await logAuditEvent({
        eventType: AuditEventType.ADMIN_PASSWORD_RESET,
        eventCategory: AuditEventCategory.SECURITY,
        severity: AuditSeverity.WARNING,
        userId: auth.userId,
        username: auth.username,
        userRole: auth.role,
        ipAddress: getClientIp(req.headers),
        deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
        attemptedRoute: `/api/users/${id}`,
        requestMethod: 'PUT',
        isAuthenticated: true,
        wasBlocked: false,
        blockReason: null,
        additionalData: {
          targetUserId: updatedUser.id,
          targetUsername: updatedUser.username,
          wasGenerated: false,
        },
      }).catch(() => {});
    }

    // SECURITY (Req 2.5): invalidate the target user's sessions when their
    // role or institution actually changes, so a demoted/transferred user
    // cannot keep using their old privileges on an existing session. The
    // actor (admin) is a different user from the target (self-role-change is
    // blocked above), so there is no current session to preserve — terminate
    // ALL of the target's sessions and force a fresh re-authentication that
    // picks up the new role/institution. Mirrors the password-change flow in
    // src/app/api/auth/change-password/route.ts.
    if (roleChanged || institutionChanged || passwordChanged) {
      const terminated = await terminateAllUserSessions(id);
      authLogger.info(
        { targetUserId: id, terminated, roleChanged, institutionChanged, passwordChanged },
        'Terminated all sessions for user after role/institution/password change'
      );
    }

    return NextResponse.json({ ...response, passwordChanged });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return new NextResponse('Username already exists', { status: 409 });
    }
    if ((error as any).code === 'P2025') {
      return new NextResponse('User not found', { status: 404 });
    }
    throw error;
  }
}, { allowedRoles: ['Admin'] }), 'users-put');

export const DELETE = wrapHandler(withAuth(async (
  req: Request,
  { auth }: { auth: any }
) => {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop()!;

    // Step-up re-authentication: user deletion is a Tier-1 sensitive action.
    const denied = requireReauth(req, 'users.delete', auth);
    if (denied) return denied;

    // SECURITY (Req 14.8): prevent self-deletion — an admin must not delete
    // their own account (would remove the only privileged session and bypass
    // the two-person rule intent for destructive actions).
    if (id === auth.userId) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Cannot delete your own account. Ask another admin.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db.user.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return new NextResponse('User not found', { status: 404 });
    }
    if ((error as any).code === 'P2003') {
      return new NextResponse(
        'Cannot delete user. It may have associated data.',
        { status: 409 }
      );
    }
    throw error;
  }
}, { allowedRoles: ['Admin'] }), 'users-delete');

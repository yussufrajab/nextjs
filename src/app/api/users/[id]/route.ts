import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logUserAction, getClientIp } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth, requireReauth } from '@/lib/api-auth';

// Safe fields that any admin can update on another user's profile.
const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .optional()
    .or(z.literal('')),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be exactly 10 digits.')
    .max(10, 'Phone number must be exactly 10 digits.')
    .regex(/^\d{10}$/, 'Phone number must contain only digits.')
    .optional(),
});

// SECURITY: This endpoint is Admin-only (enforced by withAuth below).
// Sensitive fields like role, institutionId, and active are included here
// because admins legitimately need to manage them. Password is deliberately
// excluded -- admins must use the dedicated /reset-password endpoint instead.
// Self-role-change is blocked in the handler to prevent escalation/demotion.
const adminUpdateSchema = profileUpdateSchema.extend({
  role: z.string().optional(),
  institutionId: z.string().optional(),
  active: z.boolean().optional(),
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

    // Step-up re-authentication: changing a user's role or institution is a
    // Tier-1 sensitive action (privilege escalation / cross-institution
    // movement). Profile-only edits do not require re-auth.
    if (validatedData.role !== undefined || validatedData.institutionId !== undefined) {
      const denied = requireReauth(req, 'users.role-change', auth);
      if (denied) return denied;
    }

    // Prevent admins from changing their own role (self-escalation or self-demotion).
    if (validatedData.role && id === auth.userId) {
      return new NextResponse(
        'Cannot change your own role. Ask another admin.',
        { status: 403 }
      );
    }

    // If activating a user, clear all lockout fields
    const updateData: any = { ...validatedData };
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
        previousInstitutionId: previousUser?.institutionId,
        newInstitutionId: validatedData.institutionId ?? previousUser?.institutionId,
        institutionChanged,
      },
    }).catch(() => {});

    return NextResponse.json(response);
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

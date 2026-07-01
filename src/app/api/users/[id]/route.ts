import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { logUserAction, getClientIp } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';
import { getAuthContext } from '@/lib/api-auth';

const userUpdateSchema = z.object({
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
  role: z.string().optional(),
  institutionId: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const PUT = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = userUpdateSchema.parse(body);

    if (validatedData.password) {
      const salt = await bcrypt.genSalt(10);
      validatedData.password = await bcrypt.hash(validatedData.password, salt);
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
    const actor = await getAuthContext(req);

    await logUserAction({
      action: 'UPDATED',
      targetUserId: updatedUser.id,
      targetUsername: updatedUser.username,
      performedById: actor?.userId || 'system',
      performedByUsername: actor?.username || 'system',
      performedByRole: actor?.role || 'ADMIN',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
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
}, 'users-put');

export const DELETE = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
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
}, 'users-delete');

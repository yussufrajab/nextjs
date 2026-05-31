import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logInstitutionAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const institutionSchema = z.object({
  name: z.string().min(3, {
    message: 'Institution name must be at least 3 characters long.',
  }),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  voteNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  manualEntryEnabled: z.boolean().optional(),
  manualEntryStartDate: z.string().optional().or(z.literal('')).nullable(),
  manualEntryEndDate: z.string().optional().or(z.literal('')).nullable(),
});

export const PUT = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    const body = await req.json();
    const validatedData = institutionSchema.parse(body);

    // Check if another institution has the same tin number (only if tin number is provided)
    if (validatedData.tinNumber && validatedData.tinNumber.trim().length > 0) {
      const existingTinNumber = await db.institution.findFirst({
        where: {
          tinNumber: validatedData.tinNumber.trim(),
          NOT: {
            id,
          },
        },
      });

      if (existingTinNumber) {
        return NextResponse.json(
          {
            success: false,
            message: 'An institution with this Tin Number already exists',
          },
          { status: 409 }
        );
      }
    }

    // Check if another institution has the same vote number (only if vote number is provided)
    if (validatedData.voteNumber && validatedData.voteNumber.trim().length > 0) {
      const existingVoteNumber = await db.institution.findFirst({
        where: {
          voteNumber: validatedData.voteNumber.trim(),
          NOT: {
            id,
          },
        },
      });

      if (existingVoteNumber) {
        return NextResponse.json(
          {
            success: false,
            message: 'An institution with this Vote Number already exists',
          },
          { status: 409 }
        );
      }
    }

    // Check if another institution has the same email (only if email is provided)
    if (validatedData.email && validatedData.email.trim().length > 0) {
      const existingEmail = await db.institution.findFirst({
        where: {
          email: {
            equals: validatedData.email.trim(),
            mode: 'insensitive',
          },
          NOT: {
            id,
          },
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: 'An institution with this Email already exists',
          },
          { status: 409 }
        );
      }
    }

    const updatedInstitution = await db.institution.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email?.trim() || null,
        phoneNumber: validatedData.phoneNumber?.trim() || null,
        voteNumber: validatedData.voteNumber?.trim() || null,
        tinNumber: validatedData.tinNumber?.trim() || null,
        manualEntryEnabled: validatedData.manualEntryEnabled ?? false,
        manualEntryStartDate: validatedData.manualEntryStartDate
          ? new Date(validatedData.manualEntryStartDate)
          : null,
        manualEntryEndDate: validatedData.manualEntryEndDate
          ? new Date(validatedData.manualEntryEndDate)
          : null,
      },
    });

    // Audit log: institution updated
    const authCookie = req.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('auth-storage='));
    let auditUserId: string | null = null;
    let auditUsername: string | null = null;
    let auditUserRole: string | null = null;
    if (authCookie) {
      try {
        const cookieValue = decodeURIComponent(authCookie.split('=')[1]);
        const authData = JSON.parse(cookieValue);
        const state = authData.state || authData;
        auditUserId = state.user?.id || null;
        auditUsername = state.user?.name || state.user?.username || null;
        auditUserRole = state.user?.role || state.role || null;
      } catch {}
    }

    await logInstitutionAction({
      action: 'UPDATED',
      institutionId: updatedInstitution.id,
      institutionName: updatedInstitution.name,
      performedById: auditUserId || 'system',
      performedByUsername: auditUsername || 'system',
      performedByRole: auditUserRole || 'ADMIN',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    }).catch(() => {});

    return NextResponse.json(updatedInstitution);
  }, 'institutions');

export const DELETE = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    await db.institution.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  }, 'institutions');

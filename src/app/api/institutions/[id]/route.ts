import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logInstitutionAction, getClientIp, logForbiddenRoute } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { getAuthContext, verifyAuth, requireReauth } from '@/lib/api-auth';

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
    // Step-up re-authentication: institution configuration changes are a
    // Tier-1 sensitive action. Enforce authentication (this route does not
    // use withAuth) and then require a recent re-auth.
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.context) {
      return authResult.response!;
    }
    const denied = requireReauth(req, 'institutions.update', authResult.context);
    if (denied) return denied;

    // SECURITY (Req 14.1/14.6): institution configuration is Admin-only.
    // verifyAuth + requireReauth confirm the user is authenticated and recently
    // re-authenticated, but do not restrict by role — without this guard any
    // authenticated user could edit an institution.
    if (authResult.context.role.toUpperCase() !== 'ADMIN') {
      const url = new URL(req.url);
      await logForbiddenRoute({
        userId: authResult.context.userId,
        username: authResult.context.username,
        userRole: authResult.context.role,
        attemptedRoute: url.pathname,
        ipAddress: getClientIp(req.headers),
        requestMethod: 'PUT',
        additionalData: { requiredRoles: ['Admin'], actualRole: authResult.context.role },
      }).catch(() => {});
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin role required.' },
        { status: 403 }
      );
    }

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

    // GAP-M5: capture the previous manual-entry window BEFORE the update so the
    // audit row records the previous/new diff for this sensitive config change.
    const previousInstitution = await db.institution.findUnique({
      where: { id },
      select: {
        manualEntryEnabled: true,
        manualEntryStartDate: true,
        manualEntryEndDate: true,
      },
    });

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
    // Derive the actor's identity from the signed session (authoritative),
    // not the forgeable auth-storage cookie.
    const actor = await getAuthContext(req);

    const manualEntryWindowChanged =
      validatedData.manualEntryEnabled !== undefined ||
      validatedData.manualEntryStartDate !== undefined ||
      validatedData.manualEntryEndDate !== undefined;

    await logInstitutionAction({
      action: 'UPDATED',
      institutionId: updatedInstitution.id,
      institutionName: updatedInstitution.name,
      performedById: actor?.userId || 'system',
      performedByUsername: actor?.username || 'system',
      performedByRole: actor?.role || 'ADMIN',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
      additionalData: manualEntryWindowChanged
        ? {
            manualEntryWindowChanged: true,
            previousManualEntryEnabled: previousInstitution?.manualEntryEnabled,
            newManualEntryEnabled: updatedInstitution.manualEntryEnabled,
            previousManualEntryStartDate: previousInstitution?.manualEntryStartDate,
            newManualEntryStartDate: updatedInstitution.manualEntryStartDate,
            previousManualEntryEndDate: previousInstitution?.manualEntryEndDate,
            newManualEntryEndDate: updatedInstitution.manualEntryEndDate,
          }
        : undefined,
    }).catch(() => {});

    return NextResponse.json(updatedInstitution);
  }, 'institutions');

export const DELETE = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
    // Step-up re-authentication: institution deletion is a Tier-1 sensitive
    // action. Enforce authentication and require a recent re-auth.
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.context) {
      return authResult.response!;
    }
    const denied = requireReauth(req, 'institutions.delete', authResult.context);
    if (denied) return denied;

    // SECURITY (Req 14.1/14.6): institution deletion is Admin-only. Without
    // this guard any authenticated user who passes reauth could delete an
    // institution.
    if (authResult.context.role.toUpperCase() !== 'ADMIN') {
      const url = new URL(req.url);
      await logForbiddenRoute({
        userId: authResult.context.userId,
        username: authResult.context.username,
        userRole: authResult.context.role,
        attemptedRoute: url.pathname,
        ipAddress: getClientIp(req.headers),
        requestMethod: 'DELETE',
        additionalData: { requiredRoles: ['Admin'], actualRole: authResult.context.role },
      }).catch(() => {});
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin role required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await db.institution.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  }, 'institutions');

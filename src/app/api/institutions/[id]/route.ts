import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json(updatedInstitution);
  } catch (error) {
    console.error('[INSTITUTION_PUT]', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      const target = (error as any).meta?.target;
      if (target && target.includes('tinNumber')) {
        return NextResponse.json(
          {
            success: false,
            message: 'An institution with this Tin Number already exists',
          },
          { status: 409 }
        );
      }
      if (target && target.includes('voteNumber')) {
        return NextResponse.json(
          {
            success: false,
            message: 'An institution with this Vote Number already exists',
          },
          { status: 409 }
        );
      }
      if (target && target.includes('email')) {
        return NextResponse.json(
          {
            success: false,
            message: 'An institution with this Email already exists',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          message: 'An institution with this name already exists',
        },
        { status: 409 }
      );
    }
    if ((error as any).code === 'P2025') {
      return new NextResponse('Institution not found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.institution.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[INSTITUTION_DELETE]', error);
    if ((error as any).code === 'P2025') {
      return new NextResponse('Institution not found', { status: 404 });
    }
    // Foreign key constraint error (if institutions are linked to users)
    if ((error as any).code === 'P2003') {
      return new NextResponse(
        'Cannot delete institution. It may have associated users or data.',
        { status: 409 }
      );
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

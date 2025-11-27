import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const institutionSchema = z.object({
  name: z.string().min(3, { message: "Institution name must be at least 3 characters long." }),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  voteNumber: z.string().optional(),
  tinNumber: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = institutionSchema.parse(body);

    // Check if another institution has the same tin number (only if tin number is provided)
    if (validatedData.tinNumber && validatedData.tinNumber.trim().length > 0) {
      const existingTinNumber = await db.Institution.findFirst({
        where: {
          tinNumber: validatedData.tinNumber.trim(),
          NOT: {
            id: params.id
          }
        }
      });

      if (existingTinNumber) {
        return NextResponse.json({
          success: false,
          message: 'An institution with this Tin Number already exists'
        }, { status: 409 });
      }
    }

    const updatedInstitution = await db.Institution.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        email: validatedData.email?.trim() || null,
        phoneNumber: validatedData.phoneNumber?.trim() || null,
        voteNumber: validatedData.voteNumber?.trim() || null,
        tinNumber: validatedData.tinNumber?.trim() || null,
      },
    });

    return NextResponse.json(updatedInstitution);
  } catch (error) {
    console.error("[INSTITUTION_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      const target = (error as any).meta?.target;
      if (target && target.includes('tinNumber')) {
        return new NextResponse('Institution with this Tin Number already exists', { status: 409 });
      }
      return new NextResponse('Institution with this name already exists', { status: 409 });
    }
    if ((error as any).code === 'P2025') {
        return new NextResponse('Institution not found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.Institution.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[INSTITUTION_DELETE]", error);
    if ((error as any).code === 'P2025') {
        return new NextResponse('Institution not found', { status: 404 });
    }
    // Foreign key constraint error (if institutions are linked to users)
    if ((error as any).code === 'P2003') {
        return new NextResponse('Cannot delete institution. It may have associated users or data.', { status: 409 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

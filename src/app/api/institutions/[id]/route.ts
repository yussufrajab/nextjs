import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const institutionSchema = z.object({
  name: z.string().min(3, { message: "Institution name must be at least 3 characters long." }),
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = institutionSchema.parse(body);

    const updatedInstitution = await db.institution.update({
      where: { id: params.id },
      data: { name: validatedData.name },
    });

    return NextResponse.json(updatedInstitution);
  } catch (error) {
    console.error("[INSTITUTION_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    if ((error as any).code === 'P2002') {
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
    await db.institution.delete({
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

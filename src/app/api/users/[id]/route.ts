import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  role: z.string().optional(),
  institutionId: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const validatedData = userUpdateSchema.parse(body);

    if (validatedData.password) {
      const salt = await bcrypt.genSalt(10);
      validatedData.password = await bcrypt.hash(validatedData.password, salt);
    }

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: validatedData,
      select: { id: true, name: true, username: true, role: true, active: true, institution: { select: { name: true } } },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
     if ((error as any).code === 'P2002') {
        return new NextResponse('Username already exists', { status: 409 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await db.user.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[USER_DELETE]", error);
    if ((error as any).code === 'P2025') {
        return new NextResponse('User not found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

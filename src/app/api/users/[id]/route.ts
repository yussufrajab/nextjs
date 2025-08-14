import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal("")),
  phoneNumber: z.string()
    .min(10, "Phone number must be exactly 10 digits.")
    .max(10, "Phone number must be exactly 10 digits.")
    .regex(/^\d{10}$/, "Phone number must contain only digits.")
    .optional(),
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
      select: { id: true, name: true, username: true, email: true, phoneNumber: true, role: true, active: true, institution: { select: { name: true } } },
    });

    // Generate mock phone number if not present
    const generateMockPhoneNumber = (userId: string): string => {
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const baseNumber = Math.abs(hash) % 100000000;
      return `07${baseNumber.toString().padStart(8, '0')}`;
    };

    const response = {
      ...updatedUser,
      phoneNumber: updatedUser.phoneNumber || generateMockPhoneNumber(updatedUser.id),
      isMockPhoneNumber: !updatedUser.phoneNumber,
      institution: updatedUser.institution.name,
    };

    return NextResponse.json(response);
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

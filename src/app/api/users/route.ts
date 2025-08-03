import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  role: z.string().min(1, "Role is required."),
  institutionId: z.string().min(1, "Institution is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        institution: {
          select: {
            name: true,
          },
        },
      },
    });
    
    // Flatten the institution object
    const formattedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        institution: user.institution.name,
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, role, institutionId, password } = userSchema.parse(body);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.user.create({
      data: {
        name,
        username,
        role,
        institutionId,
        password: hashedPassword,
      },
       select: { id: true, name: true, username: true, role: true, active: true, institution: { select: { name: true } } },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("[USERS_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    if ((error as any).code === 'P2002') {
      return new NextResponse('Username already exists', { status: 409 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

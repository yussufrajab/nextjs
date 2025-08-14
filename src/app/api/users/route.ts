import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string()
    .min(10, "Phone number must be exactly 10 digits.")
    .max(10, "Phone number must be exactly 10 digits.")
    .regex(/^\d{10}$/, "Phone number must contain only digits."),
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
    
    // Generate mock phone number based on user ID for consistency
    const generateMockPhoneNumber = (userId: string): string => {
      // Use a simple hash of the user ID to generate consistent mock phone numbers
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Generate a 10-digit number starting with 07 (Tanzania mobile format)
      const baseNumber = Math.abs(hash) % 100000000; // 8-digit number
      const mockPhone = `07${baseNumber.toString().padStart(8, '0')}`;
      return mockPhone;
    };

    // Generate mock email based on user ID and username for consistency
    const generateMockEmail = (userId: string, username: string): string => {
      // Use username as base, fallback to user ID hash if username is short
      const baseEmail = username.length >= 3 ? username.toLowerCase() : `user${userId.slice(-6)}`;
      return `${baseEmail}@mock.local`;
    };

    // Flatten the institution object and add mock data where missing
    const formattedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      const isMockPhone = !user.phoneNumber;
      const isMockEmail = !user.email;
      return {
        ...userWithoutPassword,
        email: user.email || generateMockEmail(user.id, user.username),
        phoneNumber: user.phoneNumber || generateMockPhoneNumber(user.id),
        isMockPhoneNumber: isMockPhone,
        isMockEmail: isMockEmail,
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
    const { name, username, email, phoneNumber, role, institutionId, password } = userSchema.parse(body);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.user.create({
      data: {
        name,
        username,
        email,
        phoneNumber,
        role,
        institutionId,
        password: hashedPassword,
      },
       select: { id: true, name: true, username: true, email: true, phoneNumber: true, role: true, active: true, institution: { select: { name: true } } },
    });

    // Format response with institution name
    const response = {
      ...newUser,
      institution: newUser.institution.name,
    };

    return NextResponse.json(response, { status: 201 });
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

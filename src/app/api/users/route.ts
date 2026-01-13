import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  hashPassword,
  calculateTemporaryPasswordExpiry,
} from '@/lib/password-utils';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be exactly 10 digits.')
    .max(10, 'Phone number must be exactly 10 digits.')
    .regex(/^\d{10}$/, 'Phone number must contain only digits.'),
  role: z.string().min(1, 'Role is required.'),
  institutionId: z.string().min(1, 'Institution is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        Institution: {
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
        hash = (hash << 5) - hash + char;
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
      const baseEmail =
        username.length >= 3
          ? username.toLowerCase()
          : `user${userId.slice(-6)}`;
      return `${baseEmail}@mock.local`;
    };

    // Flatten the institution object and add mock data where missing
    const formattedUsers = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      const isMockPhone = !user.phoneNumber;
      const isMockEmail = !user.email;
      return {
        ...userWithoutPassword,
        email: user.email || generateMockEmail(user.id, user.username),
        phoneNumber: user.phoneNumber || generateMockPhoneNumber(user.id),
        isMockPhoneNumber: isMockPhone,
        isMockEmail: isMockEmail,
        Institution: user.Institution.name,
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('[USERS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      username,
      email,
      phoneNumber,
      role,
      institutionId,
      password,
    } = userSchema.parse(body);

    // Check for duplicate username
    const existingUsername = await db.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          error: 'Duplicate entry',
          message:
            'This username is already taken. Please choose a different username.',
          field: 'username',
        },
        { status: 409 }
      );
    }

    // Check for duplicate email
    const existingEmail = await db.user.findFirst({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        {
          error: 'Duplicate entry',
          message:
            'This email address is already registered. Please use a different email.',
          field: 'email',
        },
        { status: 409 }
      );
    }

    // Check for duplicate phone number
    const existingPhone = await db.user.findFirst({
      where: { phoneNumber },
    });
    if (existingPhone) {
      return NextResponse.json(
        {
          error: 'Duplicate entry',
          message:
            'This phone number is already registered. Please use a different phone number.',
          field: 'phoneNumber',
        },
        { status: 409 }
      );
    }

    // Hash the password (provided by admin as temporary password)
    const hashedPassword = await hashPassword(password);

    const newUser = await db.user.create({
      data: {
        id: uuidv4(),
        name,
        username,
        email,
        phoneNumber,
        role,
        institutionId,
        password: hashedPassword,
        // Set temporary password flags
        isTemporaryPassword: true,
        temporaryPasswordExpiry: calculateTemporaryPasswordExpiry(),
        mustChangePassword: true,
        passwordHistory: [],
        lastPasswordChange: new Date(),
        failedPasswordChangeAttempts: 0,
        updatedAt: new Date(),
      },
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

    // Format response with institution name
    const response = {
      ...newUser,
      Institution: newUser.Institution.name,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[USERS_POST]', error);

    // Handle Zod validation errors with user-friendly messages
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map((err) => {
        const field = err.path.join('.');
        return {
          field,
          message: err.message,
        };
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Please check the following errors and try again.',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violations (P2002)
    if ((error as any).code === 'P2002') {
      const target = (error as any).meta?.target;
      let message = 'A user with this information already exists.';
      let field = 'unknown';

      // Determine which field caused the duplicate
      if (Array.isArray(target)) {
        if (target.includes('username')) {
          field = 'username';
          message =
            'This username is already taken. Please choose a different username.';
        } else if (target.includes('email')) {
          field = 'email';
          message =
            'This email address is already registered. Please use a different email.';
        } else if (target.includes('phoneNumber')) {
          field = 'phoneNumber';
          message =
            'This phone number is already registered. Please use a different phone number.';
        }
      }

      return NextResponse.json(
        {
          error: 'Duplicate entry',
          message,
          field,
        },
        { status: 409 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          'An unexpected error occurred while creating the user. Please try again later.',
      },
      { status: 500 }
    );
  }
}

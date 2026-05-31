import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  hashPassword,
  calculateTemporaryPasswordExpiry,
} from '@/lib/password-utils';
import { logUserAction, getClientIp } from '@/lib/audit-logger';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { sanitizeUser, sanitizeUsers } from '@/lib/sanitize-response';
import { wrapHandler } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

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

export const GET = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
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
      const userWithoutSensitive = sanitizeUser(user);
      const isMockPhone = !user.phoneNumber;
      const isMockEmail = !user.email;
      return {
        ...userWithoutSensitive,
        email: user.email || generateMockEmail(user.id, user.username),
        phoneNumber: user.phoneNumber || generateMockPhoneNumber(user.id),
        isMockPhoneNumber: isMockPhone,
        isMockEmail: isMockEmail,
        Institution: user.Institution.name,
      };
    });

    return NextResponse.json(formattedUsers);
  }, { allowedRoles: ['ADMIN', 'HHRMD', 'HRO'] }), 'read'), 'users');

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
    const body = await request.json();
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

    // Audit log: user created
    // Auth context from verified session
    const adminUserId = auth.userId;
    const adminUsername = auth.username;
    const adminRole = auth.role;

    await logUserAction({
      action: 'CREATED',
      targetUserId: newUser.id,
      targetUsername: newUser.username,
      performedById: adminUserId || 'system',
      performedByUsername: adminUsername || 'system',
      performedByRole: adminRole || 'ADMIN',
      ipAddress: getClientIp(request.headers),
      deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    }).catch(() => {});

    return NextResponse.json(sanitizeUser(response), { status: 201 });
  }, { allowedRoles: ['ADMIN'] }), 'write'), 'users');

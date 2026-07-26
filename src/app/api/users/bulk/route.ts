import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { calculateTemporaryPasswordExpiry } from '@/lib/password-utils';
import { hashPassword } from '@/lib/password-hash';
import { logUserAction, getClientIp } from '@/lib/audit-logger';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const bulkUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
  email: z.string().email('Invalid email.').or(z.literal('')),
  phoneNumber: z.string().min(1, 'Phone number is required.'),
  institutionName: z.string().min(1, 'Institution name is required.'),
  role: z.string().min(1, 'Role is required.'),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  try {
    const body = await request.json();
    const rows = z.array(bulkUserSchema).parse(body);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No users provided', message: 'The uploaded file contains no user data.' },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: 'Too many users', message: 'Maximum 500 users per bulk upload.' },
        { status: 400 }
      );
    }

    // Fetch all institutions for name matching
    const institutions = await db.institution.findMany();
    const results: {
      index: number;
      name: string;
      username: string;
      status: 'created' | 'skipped' | 'error';
      error?: string;
    }[] = [];

    const createdUsers: { id: string; username: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Validate email: treat empty string as missing
        if (!row.email) {
          results.push({
            index: i,
            name: row.name,
            username: row.username,
            status: 'error',
            error: 'Email is required.',
          });
          continue;
        }

        // Normalise phone: strip non-digits, take last 10
        const digits = row.phoneNumber.replace(/\D/g, '');
        const phoneNumber = digits.slice(-10);
        if (phoneNumber.length !== 10) {
          results.push({
            index: i,
            name: row.name,
            username: row.username,
            status: 'error',
            error: 'Phone number must contain exactly 10 digits.',
          });
          continue;
        }

        const email = row.email;

        // Look up institution by name (case-insensitive)
        const institution = findInstitution(institutions, row.institutionName);
        if (!institution) {
          results.push({
            index: i,
            name: row.name,
            username: row.username,
            status: 'error',
            error: `Institution "${row.institutionName}" not found.`,
          });
          continue;
        }

        // Check for duplicate username
        const existingUsername = await db.user.findUnique({
          where: { username: row.username },
        });
        if (existingUsername) {
          results.push({
            index: i,
            name: row.name,
            username: row.username,
            status: 'skipped',
            error: 'Username already taken.',
          });
          continue;
        }

        // Check for duplicate email
        const existingEmail = await db.user.findFirst({
          where: { email },
        });
        if (existingEmail) {
          results.push({
            index: i,
            name: row.name,
            username: row.username,
            status: 'skipped',
            error: 'Email already registered.',
          });
          continue;
        }

        // Check for duplicate phone
        const existingPhone = await db.user.findFirst({
          where: { phoneNumber },
        });
        if (existingPhone) {
          results.push({
            index: i,
            name: row.name,
            username: row.username,
            status: 'skipped',
            error: 'Phone number already registered.',
          });
          continue;
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(row.password);
        const newUser = await db.user.create({
          data: {
            id: uuidv4(),
            name: row.name,
            username: row.username,
            email,
            phoneNumber,
            role: row.role,
            institutionId: institution.id,
            password: hashedPassword,
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
          },
        });

        createdUsers.push({ id: newUser.id, username: newUser.username });

        results.push({
          index: i,
          name: row.name,
          username: row.username,
          status: 'created',
        });
      } catch (err) {
        logger.error({ err, index: i, username: row.username }, 'BULK_USER_CREATE');
        results.push({
          index: i,
          name: row.name,
          username: row.username,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unexpected error.',
        });
      }
    }

    // Audit log for bulk creation
    const adminUserId = auth.userId;
    const adminUsername = auth.username;
    const adminRole = auth.role;
    const createdCount = results.filter((r) => r.status === 'created').length;

    if (createdCount > 0) {
      await logUserAction({
        action: 'CREATED',
        targetUserId: adminUserId || 'system',
        targetUsername: `Bulk created ${createdCount} users`,
        performedById: adminUserId || 'system',
        performedByUsername: adminUsername || 'system',
        performedByRole: adminRole || 'ADMIN',
        ipAddress: getClientIp(request.headers),
        deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
        additionalData: {
          bulkTotal: rows.length,
          bulkCreated: createdCount,
          bulkSkipped: results.filter((r) => r.status === 'skipped').length,
          bulkFailed: results.filter((r) => r.status === 'error').length,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      total: rows.length,
      created: createdCount,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    });
  } catch (error) {
    logger.error({ err: error }, 'USERS BULK POST');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid data format in uploaded file.',
          validationErrors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}, { allowedRoles: ['ADMIN'] }), 'write'), 'users');

/**
 * Find an institution by name with case-insensitive and partial matching.
 */
function findInstitution(
  institutions: { id: string; name: string }[],
  searchName: string
): { id: string; name: string } | undefined {
  const s = searchName.trim().toLowerCase();

  // 1. Exact case-insensitive match
  let match = institutions.find((inst) => inst.name.toLowerCase() === s);
  if (match) return match;

  // 2. Input is a substring of a known institution name (e.g. "Wizara ya Afya" → "WIZARA YA AFYA")
  match = institutions.find((inst) => inst.name.toLowerCase().includes(s));
  if (match) return match;

  // 3. Known name contains the input words (word-order insensitive)
  const inputWords = s.split(/\s+/).filter(Boolean);
  if (inputWords.length > 1) {
    match = institutions.find((inst) => {
      const instLower = inst.name.toLowerCase();
      return inputWords.every((word) => instLower.includes(word));
    });
    if (match) return match;
  }

  return undefined;
}
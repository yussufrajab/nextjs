import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { logInstitutionAction, getClientIp } from '@/lib/audit-logger';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

// Cache configuration for institution data
const CACHE_TTL = 300; // 5 minutes cache (institutions rarely change)

export const GET = wrapHandler(withRateLimit(withAuth(async (request) => {
  const institutions = await db.institution.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      voteNumber: true,
      tinNumber: true,
      manualEntryEnabled: true,
      manualEntryStartDate: true,
      manualEntryEndDate: true,
    },
    orderBy: { name: 'asc' },
  });

  // Set cache headers for institutions (changes infrequently)
  const headers = new Headers();
  headers.set(
    'Cache-Control',
    `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`
  );

  return NextResponse.json(
    {
      success: true,
      data: institutions,
    },
    { headers }
  );
}), 'read'), 'institutions-get');

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const body = await request.json();
  const {
    name,
    email,
    phoneNumber,
    voteNumber,
    tinNumber,
    manualEntryEnabled,
    manualEntryStartDate,
    manualEntryEndDate,
  } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Institution name is required and must be a non-empty string',
      },
      { status: 400 }
    );
  }

  // Check if institution with the same name already exists
  const existingInstitution = await db.institution.findFirst({
    where: {
      name: {
        equals: name.trim(),
        mode: 'insensitive',
      },
    },
  });

  if (existingInstitution) {
    return NextResponse.json(
      {
        success: false,
        message: 'An institution with this name already exists',
      },
      { status: 409 }
    );
  }

  // Check if institution with the same tin number already exists (only if tin number is provided)
  if (tinNumber && tinNumber.trim().length > 0) {
    const existingTinNumber = await db.institution.findFirst({
      where: {
        tinNumber: tinNumber.trim(),
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

  // Check if institution with the same vote number already exists (only if vote number is provided)
  if (voteNumber && voteNumber.trim().length > 0) {
    const existingVoteNumber = await db.institution.findFirst({
      where: {
        voteNumber: voteNumber.trim(),
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

  // Check if institution with the same email already exists (only if email is provided)
  if (email && email.trim().length > 0) {
    const existingEmail = await db.institution.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive',
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

  const newInstitution = await db.institution.create({
    data: {
      id: uuidv4(),
      name: name.trim(),
      email: email?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      voteNumber: voteNumber?.trim() || null,
      tinNumber: tinNumber?.trim() || null,
      manualEntryEnabled: manualEntryEnabled || false,
      manualEntryStartDate: manualEntryStartDate
        ? new Date(manualEntryStartDate)
        : null,
      manualEntryEndDate: manualEntryEndDate
        ? new Date(manualEntryEndDate)
        : null,
    },
  });

  // Audit log: institution created using verified auth context
  await logInstitutionAction({
    action: 'CREATED',
    institutionId: newInstitution.id,
    institutionName: newInstitution.name,
    performedById: auth.userId || 'system',
    performedByUsername: auth.username || 'system',
    performedByRole: auth.role,
    ipAddress: getClientIp(request.headers),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  return NextResponse.json(
    {
      success: true,
      data: newInstitution,
      message: 'Institution created successfully',
    },
    { status: 201 }
  );
}, { allowedRoles: ['ADMIN'] }), 'write'), 'institutions-post');
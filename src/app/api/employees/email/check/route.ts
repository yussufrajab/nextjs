import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wrapHandler } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export const GET = wrapHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { success: false, message: 'Email parameter is required' },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check User table
  const existingUser = await db.user.findFirst({
    where: { email: trimmedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json({ inUse: true });
  }

  // Check Employee table
  const existingEmployee = await db.employee.findFirst({
    where: { email: trimmedEmail },
    select: { id: true },
  });

  if (existingEmployee) {
    return NextResponse.json({ inUse: true });
  }

  return NextResponse.json({ inUse: false });
}, 'employees-email-check');
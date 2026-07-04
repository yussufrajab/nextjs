import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';

const prisma = new PrismaClient();

export const POST = wrapHandler(withRateLimit(withAuth(async (request) => {
  const body = await request.json();
  const { zanId, payrollNumber, zssfNumber } = body;

  let zanIdExists = false;
  let payrollNumberExists = false;
  let zssfNumberExists = false;

  // Check ZanID uniqueness
  if (zanId) {
    const existingByZanId = await prisma.employee.findUnique({
      where: { zanId },
      select: { id: true },
    });
    zanIdExists = !!existingByZanId;
  }

  // Check Payroll Number uniqueness
  if (payrollNumber) {
    const existingByPayroll = await prisma.employee.findFirst({
      where: { payrollNumber },
      select: { id: true },
    });
    payrollNumberExists = !!existingByPayroll;
  }

  // Check ZSSF Number uniqueness
  if (zssfNumber) {
    const existingByZssf = await prisma.employee.findFirst({
      where: { zssfNumber },
      select: { id: true },
    });
    zssfNumberExists = !!existingByZssf;
  }

  return NextResponse.json({
    success: true,
    zanIdExists,
    payrollNumberExists,
    zssfNumberExists,
  });
}), 'write'), 'employees-validate');

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Error validating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

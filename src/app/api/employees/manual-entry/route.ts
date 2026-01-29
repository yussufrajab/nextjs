import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Parse auth storage from cookie
function parseAuthStorage(cookieValue: string | undefined): {
  role: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  institutionId: string | null;
} {
  if (!cookieValue) {
    return { role: null, isAuthenticated: false, userId: null, institutionId: null };
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    const authData = JSON.parse(decoded);
    const state = authData.state || authData;

    return {
      role: state.role || state.user?.role || null,
      isAuthenticated: state.isAuthenticated || false,
      userId: state.user?.id || null,
      institutionId: state.user?.institutionId || null,
    };
  } catch (error) {
    console.error('Failed to parse auth-storage cookie:', error);
    return { role: null, isAuthenticated: false, userId: null, institutionId: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth from cookie
    const authCookie = request.cookies.get('auth-storage')?.value;
    let { role, isAuthenticated, userId, institutionId } = parseAuthStorage(authCookie);

    // Security check 1: Must be authenticated HRO
    if (!isAuthenticated || role !== 'HRO' || !userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If institutionId is missing from cookie, fetch it from database
    if (!institutionId) {
      console.log('[MANUAL-ENTRY] institutionId missing from cookie, fetching from database for user:', userId);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { institutionId: true },
      });

      if (!user || !user.institutionId) {
        console.error('[MANUAL-ENTRY] User not found or has no institutionId:', userId);
        return NextResponse.json(
          { success: false, error: 'User institution not found. Please logout and login again.' },
          { status: 403 }
        );
      }

      institutionId = user.institutionId;
      console.log('[MANUAL-ENTRY] Successfully fetched institutionId from database:', institutionId);
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      gender,
      zanId,
      dateOfBirth,
      placeOfBirth,
      region,
      countryOfBirth,
      phoneNumber,
      contactAddress,
      zssfNumber,
      payrollNumber,
      cadre,
      salaryScale,
      ministry,
      department,
      appointmentType,
      contractType,
      recentTitleDate,
      currentReportingOffice,
      currentWorkplace,
      employmentDate,
      confirmationDate,
      retirementDate,
      status,
    } = body;

    // Validation: Required fields
    if (!name || !gender || !zanId || !dateOfBirth || !zssfNumber || !payrollNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, Gender, ZanID, Date of Birth, ZSSF Number, and Payroll Number are required'
        },
        { status: 400 }
      );
    }

    // Phone number format validation (if provided)
    if (phoneNumber) {
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Phone number must be 10 digits starting with 0 (e.g., 0773101012)'
          },
          { status: 400 }
        );
      }
    }

    // Security check 2: Verify institution has manual entry enabled
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        manualEntryEnabled: true,
        manualEntryStartDate: true,
        manualEntryEndDate: true,
      },
    });

    if (!institution || !institution.manualEntryEnabled) {
      return NextResponse.json(
        { success: false, error: 'Manual entry is not enabled for your institution' },
        { status: 403 }
      );
    }

    // Security check 3: Verify within time window
    const now = new Date();
    let isWithinTimeWindow = true;

    if (institution.manualEntryStartDate && institution.manualEntryEndDate) {
      isWithinTimeWindow =
        now >= institution.manualEntryStartDate &&
        now <= institution.manualEntryEndDate;
    } else if (institution.manualEntryStartDate) {
      isWithinTimeWindow = now >= institution.manualEntryStartDate;
    } else if (institution.manualEntryEndDate) {
      isWithinTimeWindow = now <= institution.manualEntryEndDate;
    }

    if (!isWithinTimeWindow) {
      return NextResponse.json(
        { success: false, error: 'Manual entry is not available at this time' },
        { status: 403 }
      );
    }

    // Check ZanID uniqueness
    const existingByZanId = await prisma.employee.findUnique({
      where: { zanId },
      select: { id: true },
    });

    if (existingByZanId) {
      return NextResponse.json(
        { success: false, error: 'An employee with this ZanID already exists' },
        { status: 409 }
      );
    }

    // Check Payroll Number uniqueness (if provided)
    if (payrollNumber) {
      const existingByPayroll = await prisma.employee.findFirst({
        where: { payrollNumber },
        select: { id: true },
      });

      if (existingByPayroll) {
        return NextResponse.json(
          { success: false, error: 'An employee with this Payroll Number already exists' },
          { status: 409 }
        );
      }
    }

    // Create employee - FORCE institutionId to user's institution (security)
    const employee = await prisma.employee.create({
      data: {
        id: uuidv4(),
        name,
        gender,
        zanId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        placeOfBirth: placeOfBirth || null,
        region: region || null,
        countryOfBirth: countryOfBirth || null,
        phoneNumber: phoneNumber || null,
        contactAddress: contactAddress || null,
        zssfNumber: zssfNumber || null,
        payrollNumber: payrollNumber || null,
        cadre: cadre || null,
        salaryScale: salaryScale || null,
        ministry: ministry || null,
        department: department || null,
        appointmentType: appointmentType || null,
        contractType: contractType || null,
        recentTitleDate: recentTitleDate ? new Date(recentTitleDate) : null,
        currentReportingOffice: currentReportingOffice || null,
        currentWorkplace: currentWorkplace || null,
        employmentDate: employmentDate ? new Date(employmentDate) : null,
        confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
        retirementDate: retirementDate ? new Date(retirementDate) : null,
        status: status || 'On Probation',
        institutionId: institutionId, // FORCE to user's institution
        dataSource: 'MANUAL_ENTRY',
      },
    });

    console.log('Manual employee created:', {
      employeeId: employee.id,
      name: employee.name,
      institutionId: employee.institutionId,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: employee,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating manual employee:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logEmployeeAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

const prisma = new PrismaClient();

export const POST = wrapHandler(
  withAuth(async (request: NextRequest | Request, { auth }) => {
    // Authorization is enforced by withAuth: an authenticated HRO with a valid
    // signed session. The forgeable auth-storage cookie is no longer consulted.
    const { userId, role, username } = auth;
    const institutionId = auth.institutionId;

    // verifyAuth already looked the user up in the DB; its institutionId is
    // authoritative. If empty, the user has no institution to create against.
    if (!institutionId) {
      logger.error({ value: userId }, '[MANUAL-ENTRY] User has no institutionId');
      return NextResponse.json(
        { success: false, error: 'User institution not found. Please logout and login again.' },
        { status: 403 }
      );
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

  logger.info({
    employeeId: employee.id,
    name: employee.name,
    institutionId: employee.institutionId,
    createdBy: userId,
   }, 'Manual employee created');

  // Audit log: employee created via manual entry
  await logEmployeeAction({
    action: 'CREATED',
    employeeId: employee.id,
    employeeName: employee.name,
    employeeZanId: employee.zanId,
    performedById: userId,
    performedByUsername: username || 'HRO',
    performedByRole: role,
    ipAddress: getClientIp(request.headers),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    additionalData: { dataSource: 'MANUAL_ENTRY', institutionId },
  }).catch(() => {});

  return NextResponse.json(
    {
      success: true,
      data: employee,
    },
    { status: 201 }
  );
  }, { allowedRoles: ['HRO'] }),
  'employees-manual-entry'
);

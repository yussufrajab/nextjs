import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logEmployeeAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { isPembaScopedRole } from '@/lib/role-utils';
import { deriveIsland } from '@/lib/island-utils';
import {
  getInstitutionOrgFieldValues,
  validateInstitutionOrgFields,
  hasAnyOrgField,
} from '@/lib/institution-field-validation';
import {
  GENDER_VALUES,
  APPOINTMENT_TYPE_VALUES,
  CONTRACT_TYPE_VALUES,
  isValidZssfNumber,
  isValidPayrollNumber,
  validateCrossFieldDates,
  parseISODate,
} from '@/lib/employee-field-validation';
import { findFuzzyDuplicate } from '@/lib/employee-duplicate-detection';

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

  // Pemba-scoped officers (HRO_PEMBA) can only add employees whose work
  // location is Pemba — mirrors the read-side scope so they can't create
  // Unguja employees they could then not see or manage. Uses deriveIsland
  if (isPembaScopedRole(role) && deriveIsland(department, currentWorkplace, currentReportingOffice) !== 'PEMBA') {
    return NextResponse.json(
      {
        success: false,
        error: 'Pemba-scoped officers can only add employees posted in Pemba.',
      },
      { status: 400 }
    );
  }

  // SECURITY (Req 6.8): enforce enumerated values for gender and the
  // optional appointment/contract type fields. Empty/null optional values
  // are treated as "not provided" and skipped; any supplied value must match
  // the allowed set.
  const genderResult = z.enum(GENDER_VALUES).safeParse(gender);
  if (!genderResult.success) {
    return NextResponse.json(
      { success: false, error: `Gender must be one of: ${GENDER_VALUES.join(', ')}` },
      { status: 400 }
    );
  }
  if (appointmentType != null && appointmentType !== '') {
    const r = z.enum(APPOINTMENT_TYPE_VALUES).safeParse(appointmentType);
    if (!r.success) {
      return NextResponse.json(
        { success: false, error: `Appointment type must be one of: ${APPOINTMENT_TYPE_VALUES.join(', ')}` },
        { status: 400 }
      );
    }
  }
  if (contractType != null && contractType !== '') {
    const r = z.enum(CONTRACT_TYPE_VALUES).safeParse(contractType);
    if (!r.success) {
      return NextResponse.json(
        { success: false, error: `Contract type must be one of: ${CONTRACT_TYPE_VALUES.join(', ')}` },
        { status: 400 }
      );
    }
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

  // Name validation: length and character check
  if (name.length > 200) {
    return NextResponse.json(
      { success: false, error: 'Name must be 200 characters or less' },
      { status: 400 }
    );
  }

  // Date of birth validation: not in future, reasonable age
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date of birth format' },
        { status: 400 }
      );
    }
    if (dob > now) {
      return NextResponse.json(
        { success: false, error: 'Date of birth cannot be in the future' },
        { status: 400 }
      );
    }
    const age = now.getFullYear() - dob.getFullYear();
    if (age > 120) {
      return NextResponse.json(
        { success: false, error: 'Invalid date of birth: age exceeds 120 years' },
        { status: 400 }
      );
    }
  }

  // Employment date validation: not in future
  if (employmentDate) {
    const empDate = new Date(employmentDate);
    const now = new Date();
    if (isNaN(empDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid employment date format' },
        { status: 400 }
      );
    }
    if (empDate > now) {
      return NextResponse.json(
        { success: false, error: 'Employment date cannot be in the future' },
        { status: 400 }
      );
    }
  }

  // SECURITY (Req 6.8): confirmation/retirement date format validation. These
  // dates may legitimately be in the future (pending confirmation / planned
  // retirement), so only the format is checked here — not the direction.
  if (confirmationDate && !parseISODate(confirmationDate)) {
    return NextResponse.json(
      { success: false, error: 'Invalid confirmation date format (expected YYYY-MM-DD)' },
      { status: 400 }
    );
  }
  if (retirementDate && !parseISODate(retirementDate)) {
    return NextResponse.json(
      { success: false, error: 'Invalid retirement date format (expected YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // SECURITY (Req 6.8): cross-field date logic — employmentDate must be after
  // dateOfBirth, confirmationDate on/after employmentDate, retirementDate
  // after employmentDate. Invalid formats are already reported above; this
  // only compares fields that parsed successfully.
  const crossFieldDateErrors = validateCrossFieldDates({
    dateOfBirth,
    employmentDate,
    confirmationDate,
    retirementDate,
  });
  if (crossFieldDateErrors.length > 0) {
    return NextResponse.json(
      { success: false, error: crossFieldDateErrors.join('; ') },
      { status: 400 }
    );
  }

  // ZAN ID format validation: must be numeric string
  if (!/^\d{5,12}$/.test(zanId)) {
    return NextResponse.json(
      { success: false, error: 'ZanID must be a numeric string between 5 and 12 digits' },
      { status: 400 }
    );
  }

  // SECURITY (Req 6.8): ZSSF / payroll identifier format. Required-ness is
  // checked above; here we reject values that are non-empty but malformed
  // (spaces, symbols, leading hyphen, > 50 chars).
  if (!isValidZssfNumber(zssfNumber)) {
    return NextResponse.json(
      { success: false, error: 'ZSSF number must be 2–50 alphanumeric characters (hyphens allowed)' },
      { status: 400 }
    );
  }
  if (!isValidPayrollNumber(payrollNumber)) {
    return NextResponse.json(
      { success: false, error: 'Payroll number must be 2–50 alphanumeric characters (hyphens allowed)' },
      { status: 400 }
    );
  }

  // Security check 2: Verify institution has manual entry enabled
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: {
      manualEntryEnabled: true,
      name: true,
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

  // SECURITY (Req 6.6): ministry/department/currentWorkplace are free-text
  // columns with no reference table. Validate any supplied values against the
  // distinct values already recorded for this institution's employees (the
  // institution's de-facto org-unit reference data). Bootstrap: an institution
  // with no recorded values for a field accepts any non-empty value. Skipped
  // entirely when none of these fields are supplied.
  if (hasAnyOrgField({ ministry, department, currentWorkplace })) {
    const orgFieldValues = await getInstitutionOrgFieldValues(prisma, institutionId);
    const orgFieldCheck = validateInstitutionOrgFields(
      { ministry, department, currentWorkplace },
      orgFieldValues
    );
    if (!orgFieldCheck.valid) {
      return NextResponse.json(
        { success: false, error: orgFieldCheck.errors.join('; ') },
        { status: 400 }
      );
    }
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

  // Check ZSSF Number uniqueness (if provided)
  if (zssfNumber) {
    const existingByZssf = await prisma.employee.findFirst({
      where: { zssfNumber },
      select: { id: true },
    });

    if (existingByZssf) {
      return NextResponse.json(
        { success: false, error: 'An employee with this ZSSF Number already exists' },
        { status: 409 }
      );
    }
  }

  // SECURITY (Req 6.5): fuzzy duplicate detection on name + dateOfBirth +
  // institutionId. The exact-key checks above (zanId/zssf/payroll) only catch
  // the same identifier being re-keyed; this catches the same person being
  // re-created under a fresh/mistyped identifier — same name, same DOB, same
  // institution. The DB query is scoped to institutionId + the DOB calendar
  // day, then normalized Levenshtein name similarity is compared. A match is
  // a hard block (409), consistent with the exact-key checks, and surfaces the
  // existing record's zanId so the HRO can verify before re-attempting.
  const fuzzyDup = await findFuzzyDuplicate(prisma, {
    name,
    dateOfBirth,
    institutionId,
  });
  if (fuzzyDup.duplicate && fuzzyDup.existing) {
    return NextResponse.json(
      {
        success: false,
        error: `A likely duplicate employee already exists in your institution (ZanID ${fuzzyDup.existing.zanId}, name "${fuzzyDup.existing.name}", ${(fuzzyDup.similarity * 100).toFixed(0)}% name match, same date of birth). Verify the existing record before creating a new one.`,
      },
      { status: 409 }
    );
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
      island: deriveIsland(department, currentWorkplace, currentReportingOffice, institution?.name),
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
  }, { allowedRoles: ['HRO', 'HRO_PEMBA'] }),
  'employees-manual-entry'
);

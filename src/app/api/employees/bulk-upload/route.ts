import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logEmployeeAction, logFileAction, getClientIp } from '@/lib/audit-logger';
import { validateFileUpload } from '@/lib/file-validation';
import { withAuth, AuthContext } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import {
  getInstitutionOrgFieldValues,
  validateInstitutionOrgFields,
  type InstitutionOrgFieldValues,
} from '@/lib/institution-field-validation';
import {
  GENDER_VALUES,
  APPOINTMENT_TYPE_VALUES,
  CONTRACT_TYPE_VALUES,
  isValidEnum,
  isValidZssfNumber,
  isValidPayrollNumber,
  validateCrossFieldDates,
} from '@/lib/employee-field-validation';

const prisma = new PrismaClient();

// Validate phone number format
function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return true; // Optional field
  const phoneRegex = /^0\d{9}$/;
  return phoneRegex.test(phoneNumber);
}

// Validate date format (YYYY-MM-DD)
function validateDate(dateString: string): boolean {
  if (!dateString) return true; // Optional field
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// Parse CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

interface EmployeeRow {
  rowNumber: number;
  name: string;
  gender: string;
  zanId: string;
  dateOfBirth: string;
  zssfNumber: string;
  payrollNumber: string;
  placeOfBirth?: string;
  region?: string;
  countryOfBirth?: string;
  phoneNumber?: string;
  contactAddress?: string;
  cadre: string;
  salaryScale?: string;
  ministry: string;
  department: string;
  appointmentType?: string;
  contractType?: string;
  recentTitleDate?: string;
  currentReportingOffice?: string;
  currentWorkplace?: string;
  employmentDate: string;
  confirmationDate?: string;
  retirementDate?: string;
  status?: string;
  errors: string[];
}

export const POST = wrapHandler(withRateLimit(withAuth(async (
  request: NextRequest | Request,
  { auth }: { auth: AuthContext }
) => {
  // Use verified auth context
  const role = auth.role;
  const userId = auth.userId;
  const institutionId = auth.institutionId;
  const username = auth.username;

  // Security check: Must be authenticated HRO or ADMIN
  if (!['HRO', 'ADMIN'].includes(role)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // If institutionId is missing from auth, fetch it from database
  let userInstitutionId = institutionId;
  if (!userInstitutionId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { institutionId: true },
    });

    if (!user || !user.institutionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User institution not found. Please logout and login again.',
        },
        { status: 403 }
      );
    }

    userInstitutionId = user.institutionId;
  }

  // Security check 2: Verify institution has manual entry enabled
  const inst = await prisma.institution.findUnique({
    where: { id: userInstitutionId },
    select: {
      manualEntryEnabled: true,
      manualEntryStartDate: true,
      manualEntryEndDate: true,
    },
  });

  if (!inst || !inst.manualEntryEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: 'Manual entry is not enabled for your institution',
      },
      { status: 403 }
    );
  }

  // Security check 3: Verify within time window
  const now = new Date();
  let isWithinTimeWindow = true;

  if (inst.manualEntryStartDate && inst.manualEntryEndDate) {
    isWithinTimeWindow =
      now >= inst.manualEntryStartDate &&
      now <= inst.manualEntryEndDate;
  } else if (inst.manualEntryStartDate) {
    isWithinTimeWindow = now >= inst.manualEntryStartDate;
  } else if (inst.manualEntryEndDate) {
    isWithinTimeWindow = now <= inst.manualEntryEndDate;
  }

  if (!isWithinTimeWindow) {
    return NextResponse.json(
      { success: false, error: 'Manual entry is not available at this time' },
      { status: 403 }
    );
  }

  // SECURITY (Req 6.6): ministry/department/currentWorkplace are free-text
  // columns with no reference table. Build the institution's de-facto org-unit
  // reference data (distinct values already recorded for its employees) once,
  // then validate every row against it below. Bootstrap: an institution with
  // no recorded values for a field accepts any non-empty value.
  const orgFieldValues: InstitutionOrgFieldValues =
    await getInstitutionOrgFieldValues(prisma, userInstitutionId);

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json(
      { success: false, error: 'No file uploaded' },
      { status: 400 }
    );
  }

  // Convert file to buffer for validation
  const fileArrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(fileArrayBuffer);

  const validation = await validateFileUpload(fileBuffer, file.name, file.type || 'text/csv', 'bulkUpload');
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error, errorCode: validation.errorCode },
      { status: validation.status! }
    );
  }

  // Read file content from buffer
  const fileContent = fileBuffer.toString('utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return NextResponse.json(
      {
        success: false,
        error: 'File must contain header row and at least one data row',
      },
      { status: 400 }
    );
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) =>
    h.replace('*', '').trim()
  );

  logger.info({ value: headers }, 'CSV Headers');

  // Expected header mapping
  const headerMap: Record<string, string> = {
    Name: 'name',
    Gender: 'gender',
    ZanID: 'zanId',
    'Date of Birth': 'dateOfBirth',
    'ZSSF Number': 'zssfNumber',
    'Payroll Number': 'payrollNumber',
    'Place of Birth': 'placeOfBirth',
    Region: 'region',
    'Country of Birth': 'countryOfBirth',
    'Phone Number': 'phoneNumber',
    'Contact Address': 'contactAddress',
    Cadre: 'cadre',
    'Salary Scale': 'salaryScale',
    Ministry: 'ministry',
    Department: 'department',
    'Appointment Type': 'appointmentType',
    'Contract Type': 'contractType',
    'Recent Title Date': 'recentTitleDate',
    'Current Reporting Office': 'currentReportingOffice',
    'Current Workplace': 'currentWorkplace',
    'Employment Date': 'employmentDate',
    'Confirmation Date': 'confirmationDate',
    'Retirement Date': 'retirementDate',
    Status: 'status',
  };

  // Parse data rows
  const employees: EmployeeRow[] = [];
  const validEmployees: EmployeeRow[] = [];
  const invalidEmployees: EmployeeRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowNumber = i + 1;
    const errors: string[] = [];

    // Map values to fields
    const employeeData: any = { rowNumber, errors };

    headers.forEach((header, index) => {
      const fieldName = headerMap[header];
      if (fieldName) {
        employeeData[fieldName] = values[index]?.trim() || '';
      }
    });

    // Validate required fields
    const requiredFields = [
      'name',
      'gender',
      'zanId',
      'dateOfBirth',
      'zssfNumber',
      'payrollNumber',
      'cadre',
      'ministry',
      'department',
      'employmentDate',
    ];

    requiredFields.forEach((field) => {
      if (!employeeData[field]) {
        errors.push(
          `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`
        );
      }
    });

    // Validate gender (Req 6.8)
    if (
      employeeData.gender &&
      !GENDER_VALUES.includes(employeeData.gender)
    ) {
      errors.push(`Gender must be one of: ${GENDER_VALUES.join(', ')}`);
    }

    // SECURITY (Req 6.8): appointmentType / contractType enums. The DB columns
    // are free-text; optional fields are only enforced when non-empty.
    if (!isValidEnum(employeeData.appointmentType, APPOINTMENT_TYPE_VALUES)) {
      errors.push(
        `Appointment type must be one of: ${APPOINTMENT_TYPE_VALUES.join(', ')}`
      );
    }
    if (!isValidEnum(employeeData.contractType, CONTRACT_TYPE_VALUES)) {
      errors.push(
        `Contract type must be one of: ${CONTRACT_TYPE_VALUES.join(', ')}`
      );
    }

    // Validate phone number format
    if (employeeData.phoneNumber) {
      if (!validatePhoneNumber(employeeData.phoneNumber)) {
        errors.push(
          'Phone number must be 10 digits starting with 0 (e.g., 0773101012)'
        );
      }
    }

    // Validate date formats
    const dateFields = [
      'dateOfBirth',
      'recentTitleDate',
      'employmentDate',
      'confirmationDate',
      'retirementDate',
    ];
    dateFields.forEach((field) => {
      if (employeeData[field] && !validateDate(employeeData[field])) {
        errors.push(`${field} must be in format YYYY-MM-DD`);
      }
    });

    // Date range validation
    const now = new Date();
    if (employeeData.dateOfBirth && validateDate(employeeData.dateOfBirth)) {
      const dob = new Date(employeeData.dateOfBirth);
      if (dob > now) {
        errors.push('Date of birth cannot be in the future');
      } else {
        const age = now.getFullYear() - dob.getFullYear();
        if (age > 120) {
          errors.push('Invalid date of birth: age exceeds 120 years');
        }
      }
    }
    if (employeeData.employmentDate && validateDate(employeeData.employmentDate)) {
      const empDate = new Date(employeeData.employmentDate);
      if (empDate > now) {
        errors.push('Employment date cannot be in the future');
      }
    }

    // SECURITY (Req 6.8): cross-field date logic — employmentDate after DOB,
    // confirmationDate on/after employmentDate, retirementDate after
    // employmentDate. Only compares fields with valid formats (per-field
    // format errors are already pushed above).
    const crossFieldDateErrors = validateCrossFieldDates({
      dateOfBirth: employeeData.dateOfBirth,
      employmentDate: employeeData.employmentDate,
      confirmationDate: employeeData.confirmationDate,
      retirementDate: employeeData.retirementDate,
    });
    errors.push(...crossFieldDateErrors);

    // Name length validation
    if (employeeData.name && employeeData.name.length > 200) {
      errors.push('Name must be 200 characters or less');
    }

    // ZAN ID format validation
    if (employeeData.zanId && !/^\d{5,12}$/.test(employeeData.zanId)) {
      errors.push('ZanID must be a numeric string between 5 and 12 digits');
    }

    // SECURITY (Req 6.8): ZSSF / payroll identifier format. Required-ness is
    // checked above; reject non-empty but malformed values (spaces, symbols,
    // leading hyphen, > 50 chars).
    if (!isValidZssfNumber(employeeData.zssfNumber)) {
      errors.push('ZSSF number must be 2–50 alphanumeric characters (hyphens allowed)');
    }
    if (!isValidPayrollNumber(employeeData.payrollNumber)) {
      errors.push('Payroll number must be 2–50 alphanumeric characters (hyphens allowed)');
    }

    // Validate status
    if (employeeData.status) {
      const validStatuses = [
        'On Probation',
        'Confirmed',
        'Retired',
        'On Leave',
        'Suspended',
      ];
      if (!validStatuses.includes(employeeData.status)) {
        errors.push(
          `Status must be one of: ${validStatuses.join(', ')}`
        );
      }
    } else {
      employeeData.status = 'On Probation'; // Default
    }

    // SECURITY (Req 6.6): validate free-text org fields (ministry/department/
    // currentWorkplace) against the institution's existing recorded values.
    // Bootstrap: fields with no recorded values for the institution accept any
    // non-empty value; empty values pass (currentWorkplace is optional, and
    // required-field emptiness for ministry/department is already flagged above).
    const orgFieldCheck = validateInstitutionOrgFields(
      {
        ministry: employeeData.ministry,
        department: employeeData.department,
        currentWorkplace: employeeData.currentWorkplace,
      },
      orgFieldValues
    );
    if (!orgFieldCheck.valid) {
      errors.push(...orgFieldCheck.errors);
    }

    employees.push(employeeData as EmployeeRow);

    if (errors.length === 0) {
      validEmployees.push(employeeData as EmployeeRow);
    } else {
      invalidEmployees.push(employeeData as EmployeeRow);
    }
  }

  // Check for duplicates within the file
  const zanIds = new Set<string>();
  const zssfNumbers = new Set<string>();
  const payrollNumbers = new Set<string>();

  validEmployees.forEach((emp) => {
    if (zanIds.has(emp.zanId)) {
      emp.errors.push('Duplicate ZanID within file');
      invalidEmployees.push(emp);
      validEmployees.splice(validEmployees.indexOf(emp), 1);
    } else {
      zanIds.add(emp.zanId);
    }

    if (zssfNumbers.has(emp.zssfNumber)) {
      emp.errors.push('Duplicate ZSSF Number within file');
      if (!invalidEmployees.includes(emp)) {
        invalidEmployees.push(emp);
        validEmployees.splice(validEmployees.indexOf(emp), 1);
      }
    } else {
      zssfNumbers.add(emp.zssfNumber);
    }

    if (payrollNumbers.has(emp.payrollNumber)) {
      emp.errors.push('Duplicate Payroll Number within file');
      if (!invalidEmployees.includes(emp)) {
        invalidEmployees.push(emp);
        validEmployees.splice(validEmployees.indexOf(emp), 1);
      }
    } else {
      payrollNumbers.add(emp.payrollNumber);
    }
  });

  // Check for duplicates in database
  for (const emp of validEmployees) {
    // Check ZanID
    const existingByZanId = await prisma.employee.findUnique({
      where: { zanId: emp.zanId },
      select: { id: true },
    });
    if (existingByZanId) {
      emp.errors.push('An employee with this ZanID already exists in database');
    }

    // Check Payroll Number
    const existingByPayroll = await prisma.employee.findFirst({
      where: { payrollNumber: emp.payrollNumber },
      select: { id: true },
    });
    if (existingByPayroll) {
      emp.errors.push(
        'An employee with this Payroll Number already exists in database'
      );
    }

    // Check ZSSF Number uniqueness against database
    if (emp.zssfNumber) {
      const existingByZssf = await prisma.employee.findFirst({
        where: { zssfNumber: emp.zssfNumber },
        select: { id: true },
      });
      if (existingByZssf) {
        emp.errors.push(
          'An employee with this ZSSF Number already exists in database'
        );
      }
    }

    if (emp.errors.length > 0) {
      invalidEmployees.push(emp);
    }
  }

  // Remove invalid entries from valid list
  const finalValidEmployees = validEmployees.filter(
    (emp) => emp.errors.length === 0
  );

  // Audit log: file validation performed
  await logFileAction({
    action: 'UPLOADED',
    fileName: file.name || 'unknown',
    performedById: userId,
    performedByUsername: username,
    performedByRole: role,
    ipAddress: getClientIp(request.headers),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    additionalData: {
      totalRows: employees.length,
      validRows: finalValidEmployees.length,
      invalidRows: invalidEmployees.length,
      dataSource: 'BULK_UPLOAD',
      institutionId,
    },
  }).catch(() => {});

  // Return validation results (don't create yet)
  return NextResponse.json({
    success: true,
    message: 'File validated successfully',
    data: {
      totalRows: employees.length,
      validRows: finalValidEmployees.length,
      invalidRows: invalidEmployees.length,
      validEmployees: finalValidEmployees,
      invalidEmployees: invalidEmployees,
    },
  });
}, { allowedRoles: ['HRO', 'ADMIN'] }), 'upload'), 'employees-bulk-upload');

// Endpoint to confirm and create employees after validation
export const PUT = wrapHandler(withRateLimit(withAuth(async (
  request: NextRequest | Request,
  { auth }: { auth: AuthContext }
) => {
  // Use verified auth context
  const role = auth.role;
  const userId = auth.userId;
  let institutionId = auth.institutionId;
  const username = auth.username;

  // Security check: Must be authenticated HRO or ADMIN
  if (!['HRO', 'ADMIN'].includes(role)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    );
  }

  if (!institutionId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { institutionId: true },
    });

    if (!user || !user.institutionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User institution not found',
        },
        { status: 403 }
      );
    }

    institutionId = user.institutionId;
  }

  const body = await request.json();
  const { employees } = body;

  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No valid employees to create' },
      { status: 400 }
    );
  }

  // Create all employees in a single transaction for atomicity (Req 7.9).
  // Any per-row create failure throws and aborts the WHOLE transaction →
  // Prisma rolls back every row inserted so far, so partial success is
  // impossible. The previous per-row try/catch swallowed create errors,
  // leaving partial batches committed.
  const createdEmployees: Array<{ rowNumber: number; name: string; id: string }> = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const emp of employees) {
        const employee = await tx.employee.create({
          data: {
            id: uuidv4(),
            name: emp.name,
            gender: emp.gender,
            zanId: emp.zanId,
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
            placeOfBirth: emp.placeOfBirth || null,
            region: emp.region || null,
            countryOfBirth: emp.countryOfBirth || null,
            phoneNumber: emp.phoneNumber || null,
            contactAddress: emp.contactAddress || null,
            zssfNumber: emp.zssfNumber || null,
            payrollNumber: emp.payrollNumber || null,
            cadre: emp.cadre || null,
            salaryScale: emp.salaryScale || null,
            ministry: emp.ministry || null,
            department: emp.department || null,
            appointmentType: emp.appointmentType || null,
            contractType: emp.contractType || null,
            recentTitleDate: emp.recentTitleDate
              ? new Date(emp.recentTitleDate)
              : null,
            currentReportingOffice: emp.currentReportingOffice || null,
            currentWorkplace: emp.currentWorkplace || null,
            employmentDate: emp.employmentDate
              ? new Date(emp.employmentDate)
              : null,
            confirmationDate: emp.confirmationDate
              ? new Date(emp.confirmationDate)
              : null,
            retirementDate: emp.retirementDate
              ? new Date(emp.retirementDate)
              : null,
            status: emp.status || 'On Probation',
            institutionId: institutionId,
            dataSource: 'MANUAL_ENTRY',
          },
        });

        createdEmployees.push({
          rowNumber: emp.rowNumber,
          name: emp.name,
          id: employee.id,
        });
      }
    });
  } catch (error) {
    // Transaction rolled back — NO employees were persisted. `createdEmployees`
    // reflects only what was attempted before the throw; the failing row is the
    // one at index `createdEmployees.length` (rows before it pushed on success).
    const failedIdx = createdEmployees.length;
    const failedEmp = employees[failedIdx];
    const failedRowNumber = failedEmp?.rowNumber ?? employees[0]?.rowNumber;
    const reason = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { err: error, failedRowNumber, batch: employees.length },
      'Bulk upload transaction failed — rolled back, no employees created'
    );
    return NextResponse.json(
      {
        success: false,
        error: `Bulk upload failed at row ${failedRowNumber ?? '?'}; no employees were created (transaction rolled back). Reason: ${reason}`,
        failedRow: failedRowNumber,
        failedReason: reason,
        data: { created: 0, failed: employees.length, createdEmployees: [], failedEmployees: [] },
      },
      { status: 500 }
    );
  }

  // Audit log: bulk employee creation (only on full success — a rolled-back
  // batch creates nothing and must not emit CREATED audit events).
  for (const emp of createdEmployees) {
    await logEmployeeAction({
      action: 'CREATED',
      employeeId: emp.id,
      employeeName: emp.name,
      performedById: userId,
      performedByUsername: username || 'HRO',
      performedByRole: role,
      ipAddress: getClientIp(request.headers),
      deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
      additionalData: { dataSource: 'BULK_UPLOAD', institutionId, batchRow: emp.rowNumber },
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    message: `Successfully created ${createdEmployees.length} employee(s)`,
    data: {
      created: createdEmployees.length,
      // Atomic transaction (Req 7.9): on success every row was created, so
      // there are no per-row failures. Any create error rolls back the whole
      // batch and returns from the catch above instead of reaching here.
      failed: 0,
      createdEmployees,
      failedEmployees: [],
    },
  });
}, { allowedRoles: ['HRO', 'ADMIN'] }), 'upload'), 'employees-bulk-upload');
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
    return {
      role: null,
      isAuthenticated: false,
      userId: null,
      institutionId: null,
    };
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
    return {
      role: null,
      isAuthenticated: false,
      userId: null,
      institutionId: null,
    };
  }
}

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

export async function POST(request: NextRequest) {
  try {
    // Get auth from cookie
    const authCookie = request.cookies.get('auth-storage')?.value;
    let { role, isAuthenticated, userId, institutionId } =
      parseAuthStorage(authCookie);

    // Security check 1: Must be authenticated HRO
    if (!isAuthenticated || role !== 'HRO' || !userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // If institutionId is missing from cookie, fetch it from database
    if (!institutionId) {
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

      institutionId = user.institutionId;
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
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

    console.log('CSV Headers:', headers);

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

      // Validate gender
      if (
        employeeData.gender &&
        !['Male', 'Female'].includes(employeeData.gender)
      ) {
        errors.push('Gender must be "Male" or "Female"');
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

      if (emp.errors.length > 0) {
        invalidEmployees.push(emp);
      }
    }

    // Remove invalid entries from valid list
    const finalValidEmployees = validEmployees.filter(
      (emp) => emp.errors.length === 0
    );

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
  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Endpoint to confirm and create employees after validation
export async function PUT(request: NextRequest) {
  try {
    // Get auth from cookie
    const authCookie = request.cookies.get('auth-storage')?.value;
    let { role, isAuthenticated, userId, institutionId } =
      parseAuthStorage(authCookie);

    // Security check
    if (!isAuthenticated || role !== 'HRO' || !userId) {
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

    // Create all employees in a transaction
    const createdEmployees = [];
    const failedEmployees = [];

    for (const emp of employees) {
      try {
        const employee = await prisma.employee.create({
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
      } catch (error) {
        failedEmployees.push({
          rowNumber: emp.rowNumber,
          name: emp.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdEmployees.length} employee(s)`,
      data: {
        created: createdEmployees.length,
        failed: failedEmployees.length,
        createdEmployees,
        failedEmployees,
      },
    });
  } catch (error) {
    console.error('Error creating bulk employees:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

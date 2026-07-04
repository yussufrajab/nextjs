import { NextResponse } from 'next/server';
import { uploadFile, generateObjectKey } from '@/lib/minio';
import { db as prisma } from '@/lib/db';
import { validateFileUpload } from '@/lib/file-validation';
import { withAuth, AuthContext } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limiter';
import { logFileAction, getClientIp } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';

// Document type mapping to database fields
const DOCUMENT_FIELD_MAPPING = {
  'ardhil-hali': 'ardhilHaliUrl',
  'confirmation-letter': 'confirmationLetterUrl',
  'job-contract': 'jobContractUrl',
  'birth-certificate': 'birthCertificateUrl',
} as const;

/** Extract the [id] segment from /api/employees/[id]/documents */
function getEmployeeIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/employees\/([^/]+)\/documents/);
  return match ? match[1] : null;
}

export const POST = wrapHandler(withRateLimit(withAuth(async (
  request: Request | import('next/server').NextRequest,
  { auth }: { auth: AuthContext }
) => {
  const employeeId = getEmployeeIdFromUrl(request.url);
  if (!employeeId) {
    return NextResponse.json(
      { success: false, message: 'Employee ID is required' },
      { status: 400 }
    );
  }

  // Use verified auth context instead of client-sent values
  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;

  // Get form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const documentType = formData.get('documentType') as string;

  // Check if user has permission to upload documents (HRO or CSC roles)
  const allowedRoles = ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN'];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { success: false, message: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Verify employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    return NextResponse.json(
      { success: false, message: 'Employee not found' },
      { status: 404 }
    );
  }

  // For HRO role, check if employee belongs to their institution
  if (userRole === 'HRO') {
    if (employee.institutionId !== userInstitutionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Can only upload documents for employees in your institution',
        },
        { status: 403 }
      );
    }
  }

  if (!file) {
    return NextResponse.json(
      { success: false, message: 'No file provided' },
      { status: 400 }
    );
  }

  if (!documentType || !(documentType in DOCUMENT_FIELD_MAPPING)) {
    return NextResponse.json(
      { success: false, message: 'Invalid document type' },
      { status: 400 }
    );
  }

  // Convert file to buffer first for validation
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = await validateFileUpload(buffer, file.name, file.type, 'documents');
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error, errorCode: validation.errorCode },
      { status: validation.status! }
    );
  }

  // Generate unique object key in employee-documents folder
  const objectKey = generateObjectKey(
    `employee-documents/${employeeId}`,
    `${documentType}_${file.name}`
  );

  // Upload to MinIO
  const uploadResult = await uploadFile(buffer, objectKey, file.type);

  // Update employee record with document URL
  const fieldName =
    DOCUMENT_FIELD_MAPPING[
      documentType as keyof typeof DOCUMENT_FIELD_MAPPING
    ];
  const documentUrl = `/api/files/download/${objectKey}`;

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      [fieldName]: documentUrl,
    },
  });

  // Audit logging (fire and forget)
  await logFileAction({
    action: 'UPLOADED',
    fileName: file.name,
    objectKey: uploadResult.objectKey,
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request.headers),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    additionalData: { documentType, employeeId },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      documentType,
      documentUrl,
      objectKey: uploadResult.objectKey,
      originalName: file.name,
      size: file.size,
    },
  });
}, { allowedRoles: ['HRO', 'ADMIN'] }), 'write'), 'employees-documents');

// GET endpoint to retrieve document URLs for an employee
export const GET = wrapHandler(withRateLimit(withAuth(async (
  request: Request | import('next/server').NextRequest,
  { auth }: { auth: AuthContext }
) => {
  const employeeId = getEmployeeIdFromUrl(request.url);
  if (!employeeId) {
    return NextResponse.json(
      { success: false, message: 'Employee ID is required' },
      { status: 400 }
    );
  }

  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;

  // Fetch employee with document URLs
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      ardhilHaliUrl: true,
      confirmationLetterUrl: true,
      jobContractUrl: true,
      birthCertificateUrl: true,
      institutionId: true,
    },
  });

  if (!employee) {
    return NextResponse.json(
      { success: false, message: 'Employee not found' },
      { status: 404 }
    );
  }

  // Ownership / institution check to prevent IDOR
  if (userRole === 'EMPLOYEE') {
    const requestingUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { employeeId: true },
    });
    if (!requestingUser || requestingUser.employeeId !== employeeId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
  } else if (userRole === 'HRO' || userRole === 'HRRP') {
    if (employee.institutionId !== userInstitutionId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
  }

  const documents = {
    'ardhil-hali': employee.ardhilHaliUrl,
    'confirmation-letter': employee.confirmationLetterUrl,
    'job-contract': employee.jobContractUrl,
    'birth-certificate': employee.birthCertificateUrl,
  };

  return NextResponse.json({
    success: true,
    data: {
      employeeId: employee.id,
      employeeName: employee.name,
      documents,
    },
  });
}), 'read'), 'employees-documents');
import { NextResponse } from 'next/server';
import { uploadFile, generateObjectKey } from '@/lib/minio';
import { db as prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { validateFileUpload } from '@/lib/file-validation';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logFileAction, getClientIp } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';

// Valid certificate types
const VALID_CERTIFICATE_TYPES = [
  'Certificate of Secondary education (Form IV)',
  'Advanced Certificate of Secondary education (Form VII)',
  'Certificate',
  'Diploma',
  'Advanced Diploma',
  'Bachelor Degree',
  'Master Degree',
  'PHd',
] as const;

/** Extract the [id] segment from /api/employees/[id]/certificates */
function getEmployeeIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/employees\/([^/]+)\/certificates/);
  return match ? match[1] : null;
}

export const POST = wrapHandler(withRateLimit(withAuth(async (
  request: Request | import('next/server').NextRequest,
  { auth }: { auth: import('@/lib/api-auth').AuthContext }
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
  const certificateType = formData.get('certificateType') as string;
  const certificateName = formData.get('certificateName') as string;

  // Check if user has permission to upload certificates (HRO or CSC roles)
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
    select: {
      id: true,
      institutionId: true,
      dataSource: true,
    },
  });

  if (!employee) {
    return NextResponse.json(
      { success: false, message: 'Employee not found' },
      { status: 404 }
    );
  }

  // For HRO role, check if employee belongs to their institution and is manually entered
  if (userRole === 'HRO') {
    if (employee.institutionId !== userInstitutionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Can only upload certificates for employees in your institution',
        },
        { status: 403 }
      );
    }

    // HRO can only upload certificates for manually entered employees
    if (employee.dataSource !== 'MANUAL_ENTRY') {
      return NextResponse.json(
        {
          success: false,
          message:
            'HRO can only upload certificates for manually entered employees',
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

  if (!certificateType || certificateType.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: 'Certificate type is required' },
      { status: 400 }
    );
  }

  if (!certificateName || certificateName.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: 'Certificate name is required' },
      { status: 400 }
    );
  }

  // Convert file to buffer first for validation
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = await validateFileUpload(buffer, file.name, file.type, 'certificates');
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error, errorCode: validation.errorCode },
      { status: validation.status! }
    );
  }

  // Generate unique object key in employee-certificates folder
  const objectKey = generateObjectKey(
    `employee-certificates/${employeeId}`,
    `${certificateType.replace(/[^a-zA-Z0-9]/g, '_')}_${file.name}`
  );

  // Upload to MinIO
  const uploadResult = await uploadFile(buffer, objectKey, file.type);

  // Check if certificate of this type already exists
  const existingCertificate = await prisma.employeeCertificate.findFirst({
    where: {
      employeeId: employeeId,
      type: certificateType,
    },
  });

  const certificateUrl = `/api/files/download/${objectKey}`;

  if (existingCertificate) {
    // Update existing certificate
    await prisma.employeeCertificate.update({
      where: { id: existingCertificate.id },
      data: {
        name: certificateName.trim(),
        url: certificateUrl,
      },
    });
  } else {
    // Create new certificate
    await prisma.employeeCertificate.create({
      data: {
        id: uuidv4(),
        type: certificateType,
        name: certificateName.trim(),
        url: certificateUrl,
        employeeId: employeeId,
      },
    });
  }

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
    additionalData: { certificateType, certificateName, employeeId },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: 'Certificate uploaded successfully',
    data: {
      certificateType,
      certificateName: certificateName.trim(),
      certificateUrl,
      objectKey: uploadResult.objectKey,
      originalName: file.name,
      size: file.size,
    },
  });
}, { allowedRoles: ['HRO', 'ADMIN'] }), 'write'), 'employees-certificates');

// GET endpoint to retrieve certificates for an employee
export const GET = wrapHandler(withRateLimit(withAuth(async (
  request: Request | import('next/server').NextRequest,
  { auth }: { auth: import('@/lib/api-auth').AuthContext }
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

  // Fetch employee to check access permissions
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      EmployeeCertificate: {
        select: {
          id: true,
          type: true,
          name: true,
          url: true,
        },
      },
    },
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
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      employeeId: employee.id,
      employeeName: employee.name,
      certificates: employee.EmployeeCertificate,
    },
  });
}), 'read'), 'employees-certificates');

// DELETE endpoint to remove a certificate
export const DELETE = wrapHandler(withRateLimit(withAuth(async (
  request: Request | import('next/server').NextRequest,
  { auth }: { auth: import('@/lib/api-auth').AuthContext }
) => {
  const { searchParams } = new URL(request.url);
  const certificateId = searchParams.get('certificateId');
  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;

  // Check if user has permission to delete certificates (HRO or CSC roles)
  const allowedRoles = ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN'];
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { success: false, message: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  if (!certificateId) {
    return NextResponse.json(
      { success: false, message: 'Certificate ID is required' },
      { status: 400 }
    );
  }

  const employeeId = getEmployeeIdFromUrl(request.url);
  if (!employeeId) {
    return NextResponse.json(
      { success: false, message: 'Employee ID is required' },
      { status: 400 }
    );
  }

  // Verify certificate exists and belongs to the employee
  const certificate = await prisma.employeeCertificate.findFirst({
    where: {
      id: certificateId,
      employeeId: employeeId,
    },
    include: {
      Employee: {
        select: {
          institutionId: true,
        },
      },
    },
  });

  if (!certificate) {
    return NextResponse.json(
      { success: false, message: 'Certificate not found' },
      { status: 404 }
    );
  }

  // For HRO role, check if employee belongs to their institution
  if (userRole === 'HRO') {
    if (certificate.Employee.institutionId !== userInstitutionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Can only delete certificates for employees in your institution',
        },
        { status: 403 }
      );
    }
  }

  // Delete the certificate record
  await prisma.employeeCertificate.delete({
    where: { id: certificateId },
  });

  return NextResponse.json({
    success: true,
    message: 'Certificate deleted successfully',
  });
}, { allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN'] }), 'write'), 'employees-certificates');
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateObjectKey } from '@/lib/minio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid certificate types
const VALID_CERTIFICATE_TYPES = [
  'Certificate of primary education',
  'Certificate of Secondary education (Form IV)',
  'Advanced Certificate of Secondary education (Form VII)',
  'Certificate',
  'Diploma',
  'Bachelor Degree',
  'Master Degree',
  'PHd'
] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const certificateType = formData.get('certificateType') as string;
    const certificateName = formData.get('certificateName') as string;
    const userRole = formData.get('userRole') as string;
    const userInstitutionId = formData.get('userInstitutionId') as string;

    // Check if user has permission to upload certificates (HRO or CSC roles)
    const allowedRoles = ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
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
          { success: false, message: 'Can only upload certificates for employees in your institution' },
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

    if (!certificateType || !VALID_CERTIFICATE_TYPES.includes(certificateType as any)) {
      return NextResponse.json(
        { success: false, message: 'Invalid certificate type' },
        { status: 400 }
      );
    }

    if (!certificateName || certificateName.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Certificate name is required' },
        { status: 400 }
      );
    }

    // Validate file type - only PDF files allowed
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for certificates)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate unique object key in employee-certificates folder
    const objectKey = generateObjectKey(
      `employee-certificates/${employeeId}`,
      `${certificateType.replace(/[^a-zA-Z0-9]/g, '_')}_${file.name}`
    );

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    const uploadResult = await uploadFile(
      buffer,
      objectKey,
      file.type
    );

    // Check if certificate of this type already exists
    const existingCertificate = await prisma.employeeCertificate.findFirst({
      where: {
        employeeId: employeeId,
        type: certificateType
      }
    });

    const certificateUrl = `/api/files/download/${objectKey}`;

    if (existingCertificate) {
      // Update existing certificate
      await prisma.employeeCertificate.update({
        where: { id: existingCertificate.id },
        data: {
          name: certificateName.trim(),
          url: certificateUrl
        }
      });
    } else {
      // Create new certificate
      await prisma.employeeCertificate.create({
        data: {
          type: certificateType,
          name: certificateName.trim(),
          url: certificateUrl,
          employeeId: employeeId
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: {
        certificateType,
        certificateName: certificateName.trim(),
        certificateUrl,
        objectKey: uploadResult.objectKey,
        originalName: file.name,
        size: file.size
      }
    });

  } catch (error) {
    console.error('Employee certificate upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve certificates for an employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    const { id: employeeId } = await params;

    // Fetch employee to check access permissions
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        institutionId: true,
        certificates: {
          select: {
            id: true,
            type: true,
            name: true,
            url: true
          }
        }
      }
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
        certificates: employee.certificates
      }
    });

  } catch (error) {
    console.error('Employee certificates fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a certificate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    // Check if user has permission to delete certificates (HRO or CSC roles)
    const allowedRoles = ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN'];
    if (!userRole || !allowedRoles.includes(userRole)) {
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

    const { id: employeeId } = await params;

    // Verify certificate exists and belongs to the employee
    const certificate = await prisma.employeeCertificate.findFirst({
      where: {
        id: certificateId,
        employeeId: employeeId
      },
      include: {
        employee: {
          select: {
            institutionId: true
          }
        }
      }
    });

    if (!certificate) {
      return NextResponse.json(
        { success: false, message: 'Certificate not found' },
        { status: 404 }
      );
    }

    // For HRO role, check if employee belongs to their institution
    if (userRole === 'HRO') {
      if (certificate.employee.institutionId !== userInstitutionId) {
        return NextResponse.json(
          { success: false, message: 'Can only delete certificates for employees in your institution' },
          { status: 403 }
        );
      }
    }

    // Delete the certificate record
    await prisma.employeeCertificate.delete({
      where: { id: certificateId }
    });

    return NextResponse.json({
      success: true,
      message: 'Certificate deleted successfully'
    });

  } catch (error) {
    console.error('Employee certificate delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
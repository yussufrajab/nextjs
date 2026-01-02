import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateObjectKey } from '@/lib/minio';
import { db as prisma } from '@/lib/db';

// Document type mapping to database fields
const DOCUMENT_FIELD_MAPPING = {
  'ardhil-hali': 'ardhilHaliUrl',
  'confirmation-letter': 'confirmationLetterUrl',
  'job-contract': 'jobContractUrl',
  'birth-certificate': 'birthCertificateUrl'
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const userRole = formData.get('userRole') as string;
    const userInstitutionId = formData.get('userInstitutionId') as string;

    // Check if user has permission to upload documents (HRO or CSC roles)
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
          { success: false, message: 'Can only upload documents for employees in your institution' },
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

    // Validate file type - only PDF files allowed
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for employee documents)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate unique object key in employee-documents folder
    const objectKey = generateObjectKey(
      `employee-documents/${employeeId}`,
      `${documentType}_${file.name}`
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

    // Update employee record with document URL
    const fieldName = DOCUMENT_FIELD_MAPPING[documentType as keyof typeof DOCUMENT_FIELD_MAPPING];
    const documentUrl = `/api/files/download/${objectKey}`;

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        [fieldName]: documentUrl
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentType,
        documentUrl,
        objectKey: uploadResult.objectKey,
        originalName: file.name,
        size: file.size
      }
    });

  } catch (error) {
    console.error('Employee document upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve document URLs for an employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    const { id: employeeId } = await params;

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
        institutionId: true
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

    const documents = {
      'ardhil-hali': employee.ardhilHaliUrl,
      'confirmation-letter': employee.confirmationLetterUrl,
      'job-contract': employee.jobContractUrl,
      'birth-certificate': employee.birthCertificateUrl
    };

    return NextResponse.json({
      success: true,
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        documents
      }
    });

  } catch (error) {
    console.error('Employee documents fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
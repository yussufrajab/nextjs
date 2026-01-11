import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/minio';

const TEMPLATE_OBJECT_KEY = 'templates/promotion-form-template.docx';
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Accepted Word document MIME types
const ACCEPTED_WORD_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

export async function POST(request: NextRequest) {
  try {
    // Get the multipart form data
    const formData = await request.formData();

    // Get the file and user role from form data
    const file = formData.get('file') as File;
    const userRole = formData.get('userRole') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Authorization check - only HHRMD can upload
    if (userRole !== 'HHRMD') {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized: Only HHRMD can upload the promotion form template',
        },
        { status: 403 }
      );
    }

    // Validate file type - only Word documents allowed
    if (!ACCEPTED_WORD_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only Microsoft Word files (.doc or .docx) are allowed',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 1MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'File size exceeds 1MB limit',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO (replaces existing template)
    const uploadResult = await uploadFile(
      buffer,
      TEMPLATE_OBJECT_KEY,
      file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    return NextResponse.json({
      success: true,
      message: 'Promotion form template uploaded successfully',
      data: {
        objectKey: uploadResult.objectKey,
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        etag: uploadResult.etag,
        bucketName: uploadResult.bucketName,
      },
    });
  } catch (error) {
    console.error('Promotion form template upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

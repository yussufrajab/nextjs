import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateObjectKey } from '@/lib/minio';

export async function POST(request: NextRequest) {
  try {
    // Get the multipart form data
    const formData = await request.formData();
    
    // Get the file from form data
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'documents';
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
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

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 2MB limit' },
        { status: 400 }
      );
    }

    // Generate unique object key
    const objectKey = generateObjectKey(folder, file.name);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to MinIO
    const uploadResult = await uploadFile(
      buffer,
      objectKey,
      file.type || 'application/octet-stream'
    );

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        objectKey: uploadResult.objectKey,
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        etag: uploadResult.etag,
        bucketName: uploadResult.bucketName,
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
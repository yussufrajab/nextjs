import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/minio';

/**
 * API endpoint to serve employee documents from MinIO storage
 *
 * GET /api/files/employee-documents/[filename]
 *
 * Returns the document file with proper headers for download or inline viewing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename format
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Construct the full file path in MinIO
    const filePath = `employee-documents/${filename}`;

    // Download file from MinIO (returns a stream)
    let fileStream: any;
    try {
      fileStream = await downloadFile(filePath);
    } catch (downloadError) {
      console.error(`Failed to download file from MinIO: ${filePath}`, downloadError);
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of fileStream) {
      chunks.push(Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);

    // Determine content type from file extension
    const extension = filename.split('.').pop()?.toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const contentType = contentTypeMap[extension || 'pdf'] || 'application/octet-stream';

    // Return the document with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error serving employee document:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to serve document',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

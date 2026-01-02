import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/minio';

/**
 * API endpoint to serve employee photos from MinIO storage
 *
 * GET /api/files/employee-photos/[filename]
 *
 * Returns the photo file with proper caching headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename format (should be UUID.extension)
    const filenamePattern = /^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp)$/i;
    if (!filenamePattern.test(filename)) {
      return NextResponse.json(
        { success: false, message: 'Invalid filename format' },
        { status: 400 }
      );
    }

    // Construct the full file path in MinIO
    const filePath = `employee-photos/${filename}`;

    // Download file from MinIO (returns a stream)
    let fileStream: any;
    try {
      fileStream = await downloadFile(filePath);
    } catch (downloadError) {
      console.error(
        `Failed to download file from MinIO: ${filePath}`,
        downloadError
      );
      return NextResponse.json(
        { success: false, message: 'Photo not found' },
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
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const contentType = contentTypeMap[extension || 'jpg'] || 'image/jpeg';

    // Return the image with proper headers
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
    console.error('Error serving employee photo:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to serve photo',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

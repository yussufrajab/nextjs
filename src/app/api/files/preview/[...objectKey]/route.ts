import { NextRequest, NextResponse } from 'next/server';
import {
  downloadFile,
  getFileMetadata,
  generatePresignedUrl,
} from '@/lib/minio';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectKey: string[] }> }
) {
  try {
    // Await params in Next.js 15+
    const resolvedParams = await params;

    // Reconstruct the object key from the dynamic route segments
    const objectKey = decodeURIComponent(resolvedParams.objectKey.join('/'));

    console.log('Preview API - Object key segments:', resolvedParams.objectKey);
    console.log('Preview API - Reconstructed object key:', objectKey);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const expiry = parseInt(searchParams.get('expiry') || '3600'); // 1 hour default
    const mode = searchParams.get('mode') || 'inline'; // inline or presigned

    // Get file metadata first to validate existence and get content type
    const metadata = await getFileMetadata(objectKey);

    if (mode === 'presigned') {
      // Generate presigned URL for client-side access
      const presignedUrl = await generatePresignedUrl(objectKey, expiry);

      return NextResponse.json({
        success: true,
        data: {
          presignedUrl,
          objectKey,
          contentType: metadata.contentType,
          size: metadata.size,
          lastModified: metadata.lastModified,
          expiresIn: expiry,
        },
      });
    }

    // For inline preview, stream the file directly
    const fileStream = await downloadFile(objectKey);

    // Convert Node.js stream to ReadableStream for NextResponse
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        fileStream.on('end', () => {
          controller.close();
        });

        fileStream.on('error', (error: Error) => {
          controller.error(error);
        });
      },
    });

    // Set response headers for inline display
    const headers = new Headers();
    headers.set('Content-Type', metadata.contentType);
    headers.set('Content-Length', metadata.size.toString());

    // For PDF files, set inline disposition to display in browser
    if (metadata.contentType === 'application/pdf') {
      headers.set('Content-Disposition', 'inline');
    }

    // Set cache headers
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('Last-Modified', metadata.lastModified.toUTCString());

    return new NextResponse(readable, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('File preview error:', error);
    return NextResponse.json(
      { success: false, message: 'File not found or internal server error' },
      { status: 404 }
    );
  }
}

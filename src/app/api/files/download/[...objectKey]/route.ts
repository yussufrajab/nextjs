import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getFileMetadata } from '@/lib/minio';
import { Readable } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectKey: string[] }> }
) {
  try {
    // Await params in Next.js 15+
    const resolvedParams = await params;

    // Reconstruct the object key from the dynamic route segments
    const objectKey = decodeURIComponent(resolvedParams.objectKey.join('/'));

    console.log(
      'Download API - Object key segments:',
      resolvedParams.objectKey
    );
    console.log('Download API - Reconstructed object key:', objectKey);

    // Get file metadata first to validate existence
    const metadata = await getFileMetadata(objectKey);

    // Get file stream from MinIO
    const fileStream = await downloadFile(objectKey);

    // Extract filename from object key
    const filename = objectKey.split('/').pop() || 'download';

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

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', metadata.contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', metadata.size.toString());

    return new NextResponse(readable, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { success: false, message: 'File not found or internal server error' },
      { status: 404 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getFileMetadata } from '@/lib/minio';

const TEMPLATE_OBJECT_KEY = 'templates/promotion-form-template.docx';

export async function GET(request: NextRequest) {
  try {
    // Check if the template file exists by getting metadata
    const metadata = await getFileMetadata(TEMPLATE_OBJECT_KEY);

    // Get file stream from MinIO
    const fileStream = await downloadFile(TEMPLATE_OBJECT_KEY);

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
    headers.set(
      'Content-Disposition',
      'attachment; filename="Civil_Service_Commission_Promotion_Form.docx"'
    );
    headers.set('Content-Length', metadata.size.toString());

    return new NextResponse(readable, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Promotion form template download error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Promotion form template not found. Please contact HHRMD to upload the form.',
      },
      { status: 404 }
    );
  }
}

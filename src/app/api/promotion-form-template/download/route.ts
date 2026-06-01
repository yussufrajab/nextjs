import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getFileMetadata } from '@/lib/minio';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

const TEMPLATE_OBJECT_KEY = 'templates/promotion-form-template.docx';

export const GET = wrapHandler(async (request: NextRequest) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return authResult.response!;
  }

  const rateLimitResult = await checkRateLimit(`ratelimit:${getClientIp(request)}:download`, 'download');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  let metadata;
  try {
    metadata = await getFileMetadata(TEMPLATE_OBJECT_KEY);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Promotion form template not found. Please contact HHRMD to upload the form.',
      },
      { status: 404 }
    );
  }

  const fileStream = await downloadFile(TEMPLATE_OBJECT_KEY);

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
}, 'promotion-form-template-download');
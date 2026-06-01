import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getFileMetadata } from '@/lib/minio';
import { Readable } from 'stream';
import { fileLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logFileAction } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';

function getObjectKeyFromUrl(url: string): string | null {
  const match = url.match(/\/api\/files\/download\/(.+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const GET = wrapHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ objectKey: string[] }> }
) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const rateLimitResult = await checkRateLimit(`ratelimit:${getClientIp(request)}:download`, 'download');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  const resolvedParams = await params;
  const objectKey = decodeURIComponent(resolvedParams.objectKey.join('/'));

  fileLogger.info(
    { objectKeySegments: resolvedParams.objectKey },
    'Download API - Object key segments'
  );
  fileLogger.info({ value: objectKey }, 'Download API - Reconstructed object key');

  const metadata = await getFileMetadata(objectKey);
  const fileStream = await downloadFile(objectKey);
  const filename = objectKey.split('/').pop() || 'download';

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
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Content-Length', metadata.size.toString());

  await logFileAction({
    action: 'DOWNLOADED',
    fileName: filename,
    objectKey: objectKey,
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  return new NextResponse(readable, {
    status: 200,
    headers,
  });
}, 'files-download');
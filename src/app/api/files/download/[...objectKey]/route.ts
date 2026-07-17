import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getFileMetadata, isPathTraversal } from '@/lib/minio';
import { Readable } from 'stream';
import { fileLogger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logFileAction } from '@/lib/audit-logger';
import { verifyFileHash } from '@/lib/file-integrity';
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

  // SECURITY: Path traversal validation (allows ".." inside a filename, which
  // is not traversal and can appear in legacy keys)
  if (isPathTraversal(objectKey)) {
    return NextResponse.json(
      { success: false, message: 'Invalid file path' },
      { status: 400 }
    );
  }

  fileLogger.info(
    { objectKeySegments: resolvedParams.objectKey },
    'Download API - Object key segments'
  );
  fileLogger.info({ value: objectKey }, 'Download API - Reconstructed object key');

  const metadata = await getFileMetadata(objectKey);
  const fileStream = await downloadFile(objectKey);
  const filename = objectKey.split('/').pop() || 'download';

  // Buffer the file so its SHA-256 can be verified against the recorded
  // integrity hash before serving. Generic uploads are capped at 1MB, so
  // buffering is safe. A mismatch (tampering after upload) rejects the
  // download with 410 Gone and an INTEGRITY_MISMATCH audit event.
  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(Buffer.from(chunk));
  }
  const fileBuffer = Buffer.concat(chunks);

  const integrity = await verifyFileHash(objectKey, fileBuffer);
  if (!integrity.ok) {
    fileLogger.fatal(
      { objectKey, expected: integrity.expected, actual: integrity.actual },
      'Download blocked: file integrity hash mismatch'
    );
    return NextResponse.json(
      { success: false, message: 'File integrity check failed', errorCode: 'INTEGRITY_MISMATCH' },
      { status: 410 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', metadata.contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Content-Length', fileBuffer.length.toString());

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

  return new NextResponse(fileBuffer, {
    status: 200,
    headers,
  });
}, 'files-download');
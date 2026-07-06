import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  downloadFile,
  getFileMetadata,
  generatePresignedUrl,
} from '@/lib/minio';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logFileAction } from '@/lib/audit-logger';
import { verifyFileHash } from '@/lib/file-integrity';
import { wrapHandler } from '@/lib/error-handler';

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

  // SECURITY: Path traversal validation
  if (objectKey.includes('..') || objectKey.includes('\0') || objectKey.startsWith('/')) {
    return NextResponse.json(
      { success: false, message: 'Invalid file path' },
      { status: 400 }
    );
  }

  logger.info({ value: resolvedParams.objectKey }, 'Preview API - Object key segments');
  logger.info({ value: objectKey }, 'Preview API - Reconstructed object key');

  const searchParams = request.nextUrl.searchParams;
  const expiry = parseInt(searchParams.get('expiry') || '3600');
  const mode = searchParams.get('mode') || 'inline';

  let metadata;
  try {
    metadata = await getFileMetadata(objectKey);
  } catch {
    return NextResponse.json(
      { success: false, message: 'File not found' },
      { status: 404 }
    );
  }

  if (mode === 'presigned') {
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

  const fileStream = await downloadFile(objectKey);

  // Buffer the file so its SHA-256 can be verified against the recorded
  // integrity hash before serving (inline mode). Presigned mode hands the
  // client a direct MinIO URL and cannot verify server-side. A mismatch
  // (tampering after upload) rejects the preview with 410 Gone.
  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(Buffer.from(chunk));
  }
  const fileBuffer = Buffer.concat(chunks);

  const integrity = await verifyFileHash(objectKey, fileBuffer);
  if (!integrity.ok) {
    logger.fatal(
      { objectKey, expected: integrity.expected, actual: integrity.actual },
      'Preview blocked: file integrity hash mismatch'
    );
    return NextResponse.json(
      { success: false, message: 'File integrity check failed', errorCode: 'INTEGRITY_MISMATCH' },
      { status: 410 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', metadata.contentType);
  headers.set('Content-Length', fileBuffer.length.toString());

  if (metadata.contentType === 'application/pdf') {
    headers.set('Content-Disposition', 'inline');
  }

  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('Last-Modified', metadata.lastModified.toUTCString());

  await logFileAction({
    action: 'PREVIEWED',
    fileName: objectKey.split('/').pop() || 'preview',
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
}, 'files-preview');
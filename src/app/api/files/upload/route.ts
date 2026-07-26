import { NextResponse } from 'next/server';
import { uploadFile, generateObjectKey } from '@/lib/minio';
import { logFileAction, getClientIp as getAuditClientIp, safeAuditLog } from '@/lib/audit-logger';
import { validateFileUpload } from '@/lib/file-validation';
import { recordFileHash } from '@/lib/file-integrity';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateCSRF } from '@/lib/api-csrf-middleware';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const POST = wrapHandler(async (request: Request) => {
  // 1. Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  // 2. Check rate limit
  const rateLimitResult = await checkRateLimit(`ratelimit:${getClientIp(request)}:upload`, 'upload');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  // 3. Validate CSRF
  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) {
    return csrfCheck.response!;
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const folder = (formData.get('folder') as string) || 'documents';

  if (!file) {
    return NextResponse.json(
      { success: false, message: 'No file provided' },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = await validateFileUpload(buffer, file.name, file.type, 'generic');
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error, errorCode: validation.errorCode },
      { status: validation.status! }
    );
  }

  const objectKey = generateObjectKey(folder, file.name);
  const uploadResult = await uploadFile(
    buffer,
    objectKey,
    file.type || 'application/octet-stream'
  );

  // Record the SHA-256 integrity hash so download/preview can detect
  // tampering after upload. Fail-safe: a recording failure does not abort
  // the upload — downloads simply fail-open (no hash recorded).
  await recordFileHash(uploadResult.objectKey, buffer, auth.userId).catch((err) => {
    logger.error({ err, objectKey: uploadResult.objectKey }, 'Failed to record file integrity hash');
  });

  await safeAuditLog(
    logFileAction({
      action: 'UPLOADED',
      fileName: file.name,
      objectKey: uploadResult.objectKey,
      performedById: auth.userId || 'unknown',
      performedByUsername: auth.username || 'unknown',
      performedByRole: auth.role || 'unknown',
      ipAddress: getAuditClientIp(request.headers),
      deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    }),
    'files-upload'
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
    },
  });
}, 'files-upload');

import { NextRequest, NextResponse } from 'next/server';
import { getFileMetadata, isPathTraversal } from '@/lib/minio';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { authorizeFileOrDeny } from '@/lib/file-access';
import { logFileAction, safeAuditLog } from '@/lib/audit-logger';
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

  // SECURITY: Path traversal validation (allows ".." inside a filename, which
  // is not traversal and can appear in legacy keys)
  if (isPathTraversal(objectKey)) {
    return NextResponse.json(
      { success: false, message: 'Invalid file path' },
      { status: 400 }
    );
  }

  // SECURITY (Req 10.1–10.2, 17.3, 27.1, 30.1): per-object authorization
  // before any MinIO access — closes the IDOR that let any authenticated
  // user probe any object key. Must run before getFileMetadata so a denied
  // request cannot use this endpoint as an existence oracle.
  const access = await authorizeFileOrDeny(request, auth, objectKey);
  if (!access.allowed) {
    return access.response;
  }

  logger.info(
    { objectKeySegments: resolvedParams.objectKey },
    'File exists API - Object key segments'
  );
  logger.info({ value: objectKey }, 'File exists API - Reconstructed object key');

  // SECURITY (Req 10.8): audit every authorized existence probe so file-access
  // enumeration attempts are reconstructable. Both exists:true and exists:false
  // outcomes are logged — a probe for a non-existent key is still an access
  // attempt worth recording. Fire-and-forget so a logging failure cannot break
  // the read.
  let metadata = null;
  try {
    metadata = await getFileMetadata(objectKey);
  } catch {
    // File not found — exists:false below
  }

  await safeAuditLog(
    logFileAction({
      action: 'EXISTS',
      fileName: objectKey.split('/').pop() || undefined,
      objectKey,
      performedById: auth.userId,
      performedByUsername: auth.username,
      performedByRole: auth.role,
      ipAddress: getClientIp(request),
      deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
      additionalData: { exists: !!metadata },
    }),
    'files-exists'
  );

  if (metadata) {
    return NextResponse.json({
      success: true,
      exists: true,
      metadata: {
        size: metadata.size,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified,
      },
    });
  }

  return NextResponse.json({
    success: true,
    exists: false,
  });
}, 'files-exists');
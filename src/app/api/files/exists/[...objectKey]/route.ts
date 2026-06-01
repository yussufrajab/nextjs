import { NextRequest, NextResponse } from 'next/server';
import { getFileMetadata } from '@/lib/minio';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ objectKey: string[] }> }
) => {
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

  const resolvedParams = await params;
  const objectKey = decodeURIComponent(resolvedParams.objectKey.join('/'));

  logger.info(
    { objectKeySegments: resolvedParams.objectKey },
    'File exists API - Object key segments'
  );
  logger.info({ value: objectKey }, 'File exists API - Reconstructed object key');

  try {
    const metadata = await getFileMetadata(objectKey);

    return NextResponse.json({
      success: true,
      exists: true,
      metadata: {
        size: metadata.size,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified,
      },
    });
  } catch {
    // File not found — return exists: false (not an error)
    return NextResponse.json({
      success: true,
      exists: false,
    });
  }
}, 'files-exists');
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/minio';
import { validateFileUpload } from '@/lib/file-validation';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logFileAction } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';

const TEMPLATE_OBJECT_KEY = 'templates/promotion-form-template.docx';

export const POST = wrapHandler(async (request: NextRequest) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const rateLimitResult = await checkRateLimit(`ratelimit:${getClientIp(request)}:upload`, 'upload');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  // Authorization check - only HHRMD can upload
  if (auth.role !== 'HHRMD') {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized: Only HHRMD can upload the promotion form template',
      },
      { status: 403 }
    );
  }

  // Get the multipart form data
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json(
      { success: false, message: 'No file provided' },
      { status: 400 }
    );
  }

  // Convert file to buffer first for validation
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = await validateFileUpload(buffer, file.name, file.type, 'templates');
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error, errorCode: validation.errorCode },
      { status: validation.status! }
    );
  }

  // Upload to MinIO (replaces existing template)
  const uploadResult = await uploadFile(
    buffer,
    TEMPLATE_OBJECT_KEY,
    file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  // Audit logging (fire and forget)
  await logFileAction({
    action: 'UPLOADED',
    fileName: file.name,
    objectKey: uploadResult.objectKey,
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: 'Promotion form template uploaded successfully',
    data: {
      objectKey: uploadResult.objectKey,
      originalName: file.name,
      size: file.size,
      contentType: file.type,
      etag: uploadResult.etag,
      bucketName: uploadResult.bucketName,
    },
  });
}, 'promotion-form-template-upload');
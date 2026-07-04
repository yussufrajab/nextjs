import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/minio';
import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logFileAction } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
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

  const { filename } = await params;

  const filenamePattern = /^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp)$/i;
  if (!filenamePattern.test(filename)) {
    return NextResponse.json(
      { success: false, message: 'Invalid filename format' },
      { status: 400 }
    );
  }

  const employeeId = filename.substring(0, filename.lastIndexOf('.'));
  const roleUpper = auth.role.toUpperCase();

  if (['ADMIN', 'HRMO', 'HHRMD', 'CSCS', 'DO', 'PO'].includes(roleUpper)) {
    // Central/commission roles — unrestricted access
  } else if (roleUpper === 'HRO' || roleUpper === 'HRRP') {
    // Institution-scoped access: employee must belong to the user's institution
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { institutionId: true },
    });
    if (!employee || employee.institutionId !== auth.institutionId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
  } else if (roleUpper === 'EMPLOYEE') {
    // Ownership check: the requested employee must be the user's own record
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { employeeId: true },
    });
    if (!user?.employeeId || user.employeeId !== employeeId) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }
  } else {
    // Unknown role — deny by default
    return NextResponse.json(
      { success: false, message: 'Access denied' },
      { status: 403 }
    );
  }

  const filePath = `employee-photos/${filename}`;

  let fileStream: any;
  try {
    fileStream = await downloadFile(filePath);
  } catch (downloadError) {
    logger.error(
      { err: downloadError },
      `Failed to download file from MinIO: ${filePath}`
    );
    return NextResponse.json(
      { success: false, message: 'Photo not found' },
      { status: 404 }
    );
  }

  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(Buffer.from(chunk));
  }
  const fileBuffer = Buffer.concat(chunks);

  const extension = filename.split('.').pop()?.toLowerCase();
  const contentTypeMap: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const contentType = contentTypeMap[extension || 'jpg'] || 'image/jpeg';

  await logFileAction({
    action: 'DOWNLOADED',
    fileName: filename,
    objectKey: filePath,
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    additionalData: { employeeId },
  }).catch(() => {});

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}, 'files-employee-photos');
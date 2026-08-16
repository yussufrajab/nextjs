import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/minio';
import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { isHroLike, isHrrpLike, isPembaScopedRole, isPembaEmployee } from '@/lib/role-utils';
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

  if (!filename || filename.includes('..') || filename.includes('/')) {
    return NextResponse.json(
      { success: false, message: 'Invalid filename' },
      { status: 400 }
    );
  }

  const employeeId = filename.substring(0, filename.indexOf('_'));
  const roleUpper = auth.role.toUpperCase();

  if (['ADMIN', 'HRMO', 'HHRMD', 'CSCS', 'DO', 'PO'].includes(roleUpper)) {
    // Central/commission roles — unrestricted access
  } else if (isHroLike(auth.role) || isHrrpLike(auth.role)) {
    // Institution-scoped access: employee must belong to the user's institution.
    // Pemba-scoped roles are further restricted to Pemba-department employees.
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { institutionId: true, department: true, island: true },
    });
    if (
      !employee ||
      employee.institutionId !== auth.institutionId ||
      (isPembaScopedRole(auth.role) &&
        !isPembaEmployee(employee))
    ) {
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

  const filePath = `employee-documents/${filename}`;

  let fileStream: any;
  try {
    fileStream = await downloadFile(filePath);
  } catch (downloadError) {
    logger.error(
      { err: downloadError },
      `Failed to download file from MinIO: ${filePath}`
    );
    return NextResponse.json(
      { success: false, message: 'Document not found' },
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
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const contentType =
    contentTypeMap[extension || 'pdf'] || 'application/octet-stream';

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
}, 'files-employee-documents');
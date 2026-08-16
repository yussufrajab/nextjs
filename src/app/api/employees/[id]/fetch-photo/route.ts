import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';
import { validateFileUpload } from '@/lib/file-validation';
import { getHrimsApiConfig } from '@/lib/hrims-config';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { isHroLike, isHrrpLike, isPembaScopedRole, isPembaEmployee } from '@/lib/role-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';
import { recordFileHash } from '@/lib/file-integrity';

export const POST = wrapHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const rateLimitResult = await checkRateLimit(`ratelimit:${getClientIp(request)}:write`, 'write');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  const { id: employeeId } = await params;
  const roleUpper = auth.role.toUpperCase();

  if (['ADMIN', 'HRMO', 'HHRMD', 'CSCS', 'DO', 'PO'].includes(roleUpper)) {
  } else if (isHroLike(auth.role) || isHrrpLike(auth.role)) {
    // Institution-scoped access; pemba roles further restricted to Pemba dept.
    const empCheck = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { institutionId: true, department: true, island: true },
    });
    if (
      !empCheck ||
      empCheck.institutionId !== auth.institutionId ||
      (isPembaScopedRole(auth.role) &&
        !isPembaEmployee(empCheck))
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

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      payrollNumber: true,
      profileImageUrl: true,
      name: true,
      dataSource: true,
    },
  });

  if (!employee) {
    return NextResponse.json(
      { success: false, message: 'Employee not found' },
      { status: 404 }
    );
  }

  if (employee.dataSource === 'MANUAL_ENTRY') {
    return NextResponse.json(
      {
        success: false,
        message: 'Cannot fetch photo from HRIMS for manually entered employees',
      },
      { status: 400 }
    );
  }

  if (!employee.payrollNumber) {
    return NextResponse.json(
      { success: false, message: 'Employee does not have a payroll number' },
      { status: 400 }
    );
  }

  if (
    employee.profileImageUrl &&
    (employee.profileImageUrl.startsWith('data:image') ||
    employee.profileImageUrl.startsWith('/api/files/employee-photos/'))
  ) {
    return NextResponse.json({
      success: true,
      message: 'Photo already exists',
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        photoUrl: employee.profileImageUrl,
        alreadyExists: true,
      },
    });
  }

  logger.info(
    ` Fetching photo for employee ${employee.name} (Payroll: ${employee.payrollNumber})`
  );

  const hrimsConfig = await getHrimsApiConfig();
  const photoPayload = {
    RequestId: '203',
    SearchCriteria: employee.payrollNumber,
  };

  const hrimsResponse = await fetch(`${hrimsConfig.BASE_URL}/Employees`, {
    method: 'POST',
    headers: {
      ApiKey: hrimsConfig.API_KEY,
      Token: hrimsConfig.TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(photoPayload),
    signal: AbortSignal.timeout(30000),
  });

  if (!hrimsResponse.ok) {
    logger.error(
      ` HRIMS API error: ${hrimsResponse.status} ${hrimsResponse.statusText}`
    );
    return NextResponse.json(
      {
        success: false,
        message: `HRIMS API returned error: ${hrimsResponse.status}`,
        error: hrimsResponse.statusText,
      },
      { status: 502 }
    );
  }

  const hrimsData = await hrimsResponse.json();
  logger.info(' Received response from HRIMS');
  logger.info(`HRIMS Response structure: ${JSON.stringify(hrimsData).substring(0, 500)}`);

  let photoBase64: string | null = null;

  if (hrimsData.photo && hrimsData.photo.content) {
    logger.info('Found photo at: hrimsData.photo.content');
    photoBase64 = hrimsData.photo.content;
  } else if (
    hrimsData.data &&
    hrimsData.data.photo &&
    hrimsData.data.photo.content
  ) {
    logger.info('Found photo at: hrimsData.data.photo.content');
    photoBase64 = hrimsData.data.photo.content;
  } else if (hrimsData.data && typeof hrimsData.data === 'string') {
    logger.info('Found photo at: hrimsData.data (string)');
    photoBase64 = hrimsData.data;
  } else if (typeof hrimsData === 'string') {
    logger.info('Found photo as direct string');
    photoBase64 = hrimsData;
  } else if (hrimsData.data && hrimsData.data.Picture) {
    logger.info('Found photo at: hrimsData.data.Picture');
    photoBase64 = hrimsData.data.Picture;
  } else if (hrimsData.Picture) {
    logger.info('Found photo at: hrimsData.Picture');
    photoBase64 = hrimsData.Picture;
  }

  if (!photoBase64) {
    logger.info(' No photo data found in HRIMS response');
    logger.info({ value: Object.keys(hrimsData) }, 'Response keys');
    if (hrimsData.data) {
      logger.info({ value: Object.keys(hrimsData.data) }, 'Data keys');
    }
    return NextResponse.json(
      {
        success: false,
        message: 'No photo data found in HRIMS response',
        hrimsResponse: hrimsData,
        availableKeys: Object.keys(hrimsData),
        dataKeys: hrimsData.data ? Object.keys(hrimsData.data) : null,
      },
      { status: 404 }
    );
  }

  logger.info(` Storing photo for employee ${employee.name} to MinIO...`);

  let base64Data = photoBase64;
  let mimeType = 'image/jpeg';

  if (photoBase64.startsWith('data:image')) {
    const matches = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  const photoBuffer = Buffer.from(base64Data, 'base64');

  const extensionMap: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const extension = extensionMap[mimeType.toLowerCase()] || 'jpg';

  const photoValidation = await validateFileUpload(photoBuffer, `photo.${extension}`, mimeType, 'photos');
  if (!photoValidation.success) {
    logger.error(`Photo validation failed for employee ${employee.name}: ${photoValidation.error}`);
    return NextResponse.json(
      { success: false, message: `Photo validation failed: ${photoValidation.error}`, errorCode: photoValidation.errorCode },
      { status: photoValidation.status! }
    );
  }

  const fileName = `${employee.id}.${extension}`;
  const filePath = `employee-photos/${fileName}`;

  try {
    await uploadFile(photoBuffer, filePath, mimeType);
    logger.info(` Photo uploaded to MinIO: ${filePath}`);

    // Record the integrity hash so the download/preview routes can verify
    // the photo on read. Without this the routes fail closed with 410 Gone
    // for sensitive (employee-photos/) keys.
    await recordFileHash(filePath, photoBuffer, null).catch((err) => {
      logger.error({ err, objectKey: filePath }, 'Failed to record photo integrity hash');
    });
  } catch (uploadError) {
    logger.error({ value: uploadError }, ' Failed to upload to MinIO');
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to upload photo to storage',
        error:
          uploadError instanceof Error
            ? uploadError.message
            : 'Unknown error',
      },
      { status: 500 }
    );
  }

  const minioUrl = `/api/files/employee-photos/${fileName}`;

  const updatedEmployee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      profileImageUrl: minioUrl,
    },
  });

  logger.info(` Photo stored successfully for employee ${employee.name}`);

  return NextResponse.json({
    success: true,
    message: 'Photo fetched and stored successfully',
    data: {
      employeeId: updatedEmployee.id,
      employeeName: employee.name,
      photoUrl: updatedEmployee.profileImageUrl,
      photoSize: photoBuffer.length,
    },
  });
}, 'employees-fetch-photo');
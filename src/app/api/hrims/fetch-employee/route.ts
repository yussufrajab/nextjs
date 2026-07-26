import { NextRequest, NextResponse } from 'next/server';
import { getHrimsApiConfig, isHrimsConfigError } from '@/lib/hrims-config';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/minio';
import { hrimsLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { logHrimsSync, getClientIp } from '@/lib/audit-logger';

interface HRIMSEmployeeResponse {
  success: boolean;
  message: string;
  data?: {
    Employee: {
      zanId: string;
      payrollNumber?: string;
      name: string;
      gender?: string;
      dateOfBirth?: string;
      placeOfBirth?: string;
      region?: string;
      countryOfBirth?: string;
      phoneNumber?: string;
      alternativePhone?: string;
      contactAddress?: string;
      zssfNumber?: string;
      cadre?: string;
      salaryScale?: string;
      ministry?: string;
      department?: string;
      appointmentType?: string;
      contractType?: string;
      recentTitleDate?: string;
      currentReportingOffice?: string;
      currentWorkplace?: string;
      employmentDate?: string;
      confirmationDate?: string;
      retirementDate?: string;
      status?: string;
      institutionVoteNumber: string;
      photo?: {
        contentType: string;
        content: string;
        lastUpdated?: string;
      };
    };
  };
}

interface HRIMSDocumentsResponse {
  success: boolean;
  data?: {
    documents: Array<{
      id: string;
      type: string;
      name: string;
      contentType: string;
      content: string;
      size?: number;
      lastUpdated?: string;
    }>;
  };
}

interface HRIMSCertificatesResponse {
  success: boolean;
  data?: {
    certificates: Array<{
      id: string;
      type: string;
      name: string;
      contentType: string;
      content: string;
      size?: number;
      lastUpdated?: string;
      institutionAwarded?: string;
      yearAwarded?: string;
    }>;
  };
}

async function fetchFromHRIMS(
  requestId: string,
  requestPayloadData: any,
  hrimsConfig: { BASE_URL: string; API_KEY: string; TOKEN: string }
): Promise<any> {
  const response = await fetch(`${hrimsConfig.BASE_URL}/Employees`, {
    method: 'POST',
    headers: {
      ApiKey: hrimsConfig.API_KEY,
      Token: hrimsConfig.TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RequestId: requestId,
      RequestPayloadData: requestPayloadData,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HRIMS API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function saveEmployeeToDatabase(hrimsData: any, institutionId: string) {
  try {
    const personalInfo = hrimsData.personalInfo;
    const currentEmployment =
      hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) ||
      hrimsData.employmentHistories?.[0];
    const currentSalary =
      hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) ||
      hrimsData.salaryInformation?.[0];
    const highestEducation = hrimsData.educationHistories?.[0];

    // Find or create employee
    const existingEmployee = await db.employee.findUnique({
      where: { zanId: personalInfo.zanIdNumber },
    });

    const employeeId = existingEmployee?.id || uuidv4();

    // Build full name
    const fullName = [
      personalInfo.firstName,
      personalInfo.middleName,
      personalInfo.lastName,
    ]
      .filter((name) => name && name.trim())
      .join(' ');

    // Map HRIMS data to our database structure
    const dbEmployeeData = {
      id: employeeId,
      name: fullName,
      gender:
        personalInfo.genderName === 'Mwanamme'
          ? 'Male'
          : personalInfo.genderName === 'Mwanamke'
            ? 'Female'
            : personalInfo.genderName,
      dateOfBirth: personalInfo.birthDate
        ? new Date(personalInfo.birthDate)
        : null,
      placeOfBirth: personalInfo.placeOfBirth,
      region: personalInfo.regionName,
      countryOfBirth: personalInfo.birthCountryName,
      zanId: personalInfo.zanIdNumber,
      phoneNumber: personalInfo.primaryPhone || personalInfo.workPhone,
      contactAddress:
        [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
          .filter((part) => part && part.trim())
          .join(', ') || null,
      zssfNumber: personalInfo.zssfNumber,
      payrollNumber: personalInfo.payrollNumber || '',
      cadre: currentEmployment?.titleName,
      salaryScale: currentSalary?.salaryScaleName,
      ministry: currentEmployment?.entityName,
      department: currentEmployment?.subEntityName,
      appointmentType: currentEmployment?.appointmentTypeName,
      contractType: null, // Not available in HRIMS data
      recentTitleDate: currentEmployment?.fromDate
        ? new Date(currentEmployment.fromDate)
        : null,
      currentReportingOffice: currentEmployment?.subEntityName,
      currentWorkplace: currentEmployment?.entityName,
      employmentDate: personalInfo.employmentDate
        ? new Date(personalInfo.employmentDate)
        : null,
      confirmationDate: personalInfo.employmentConfirmationDate
        ? new Date(personalInfo.employmentConfirmationDate)
        : null,
      retirementDate: currentEmployment?.toDate
        ? new Date(currentEmployment.toDate)
        : null,
      status: personalInfo.isEmployeeConfirmed ? 'Confirmed' : 'On Probation',
      institutionId: institutionId,
      // Store additional HRIMS-specific data
      employeeEntityId: personalInfo.zanIdNumber, // Use ZanID as entity ID
    };

    hrimsLogger.info({
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      ministry: dbEmployeeData.ministry,
      cadre: dbEmployeeData.cadre,
    }, 'Saving employee data:');

    // Save/update employee
    await db.employee.upsert({
      where: { zanId: personalInfo.zanIdNumber },
      update: dbEmployeeData,
      create: dbEmployeeData,
    });

    return employeeId;
  } catch (error) {
    hrimsLogger.error({ err: error }, 'Error saving employee to database:');
    throw error;
  }
}

// Document types for HRIMS RequestId 206
const DOCUMENT_TYPES = [
  {
    code: '2',
    name: 'Ardhilihal',
    dbField: 'ardhilHaliUrl',
    dbKey: 'ardhilHali',
  },
  {
    code: '3',
    name: 'Employment Contract',
    dbField: 'jobContractUrl',
    dbKey: 'jobContract',
  },
  {
    code: '4',
    name: 'Birth Certificate',
    dbField: 'birthCertificateUrl',
    dbKey: 'birthCertificate',
  },
] as const;

async function processDocuments(
  payrollNumber: string,
  employeeId: string,
  hrimsConfig: { BASE_URL: string; API_KEY: string; TOKEN: string }
) {
  try {
    hrimsLogger.info(
      ` Fetching documents for employee (Payroll: ${payrollNumber})`
    );
    let savedDocuments = 0;

    // Fetch each document type separately using RequestId 206
    for (const docType of DOCUMENT_TYPES) {
      try {
        const payload = {
          RequestId: '206',
          SearchCriteria: payrollNumber,
          RequestPayloadData: {
            RequestBody: docType.code,
          },
        };

        const response = await fetch(`${hrimsConfig.BASE_URL}/Employees`, {
          method: 'POST',
          headers: {
            ApiKey: hrimsConfig.API_KEY,
            Token: hrimsConfig.TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          hrimsLogger.error(
            ` HRIMS API error for ${docType.name}: ${response.status}`
          );
          continue;
        }

        const hrimsData = await response.json();

        // Check for HRIMS internal errors
        if (hrimsData.code === 500 || hrimsData.status === 'Failure') {
          hrimsLogger.error(
            `HRIMS internal error for ${docType.name}: ${hrimsData.message}`
          );
          continue;
        }

        // Extract attachments
        const attachments = Array.isArray(hrimsData.data) ? hrimsData.data : [];
        if (attachments.length === 0) {
          hrimsLogger.info(` No ${docType.name} found`);
          continue;
        }

        // Take first attachment (most recent)
        const doc = attachments[0];
        const attachmentContent =
          typeof doc.attachmentContent === 'string' ? doc.attachmentContent : '';

        // HRIMS can return metadata (contentSize > 0) with an empty
        // attachmentContent — an upstream content-delivery issue. Skip
        // rather than storing an empty/invalid file.
        if (!attachmentContent) {
          hrimsLogger.warn(
            ` HRIMS returned ${docType.name} metadata with empty content for ${payrollNumber} (contentSize: ${doc.contentSize ?? 'n/a'}) — skipping, upstream content-delivery issue`
          );
          continue;
        }

        // Convert base64 to buffer and upload to MinIO
        const buffer = Buffer.from(attachmentContent, 'base64');
        const fileName = `${employeeId}_${docType.dbKey}.pdf`;
        const filePath = `employee-documents/${fileName}`;

        await uploadFile(buffer, filePath, 'application/pdf');
        hrimsLogger.info(` Uploaded ${docType.name} to MinIO: ${filePath}`);

        // Update employee record with MinIO URL
        const minioUrl = `/api/files/employee-documents/${fileName}`;
        await db.employee.update({
          where: { id: employeeId },
          data: {
            [docType.dbField]: minioUrl,
          },
        });

        savedDocuments++;
      } catch (error) {
        hrimsLogger.error({ err: error }, `Error processing ${docType.name}:`);
      }
    }

    return savedDocuments;
  } catch (error) {
    hrimsLogger.error({ err: error }, 'Error processing documents:');
    return 0;
  }
}

async function processPhoto(
  payrollNumber: string,
  employeeId: string,
  hrimsConfig: { BASE_URL: string; API_KEY: string; TOKEN: string }
) {
  try {
    hrimsLogger.info(` Fetching photo for employee (Payroll: ${payrollNumber})`);

    const photoPayload = {
      RequestId: '203',
      SearchCriteria: payrollNumber,
    };

    const photoResponse = await fetch(`${hrimsConfig.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        ApiKey: hrimsConfig.API_KEY,
        Token: hrimsConfig.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoPayload),
      signal: AbortSignal.timeout(30000),
    });

    if (!photoResponse.ok) {
      hrimsLogger.error(` HRIMS API error for photo: ${photoResponse.status}`);
      return false;
    }

    const photoData = await photoResponse.json();
    let photoBase64: string | null = null;

    // Extract photo from response (try multiple possible fields)
    if (photoData.data && typeof photoData.data === 'string') {
      photoBase64 = photoData.data;
    } else if (photoData.photo && photoData.photo.content) {
      photoBase64 = photoData.photo.content;
    } else if (
      photoData.data &&
      photoData.data.photo &&
      photoData.data.photo.content
    ) {
      photoBase64 = photoData.data.photo.content;
    } else if (photoData.data && photoData.data.Picture) {
      photoBase64 = photoData.data.Picture;
    } else if (photoData.Picture) {
      photoBase64 = photoData.Picture;
    }

    if (!photoBase64) {
      hrimsLogger.info(' No photo data in HRIMS response');
      return false;
    }

    // Convert base64 to buffer
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

    // Determine file extension
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const extension = extensionMap[mimeType.toLowerCase()] || 'jpg';

    // Upload to MinIO
    const fileName = `${employeeId}.${extension}`;
    const filePath = `employee-photos/${fileName}`;

    await uploadFile(photoBuffer, filePath, mimeType);
    hrimsLogger.info(` Photo uploaded to MinIO: ${filePath}`);

    // Store MinIO URL in database
    const minioUrl = `/api/files/employee-photos/${fileName}`;
    await db.employee.update({
      where: { id: employeeId },
      data: { profileImageUrl: minioUrl },
    });

    return true;
  } catch (error) {
    hrimsLogger.error({ err: error }, 'Error processing photo:');
    return false;
  }
}

export const POST = wrapHandler(withAuth(async (req, { auth }) => {
  const body = await req.json();
  const { zanId, payrollNumber, institutionVoteNumber } = body;

  const auditCommon = {
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    route: '/api/hrims/fetch-employee',
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
  };

  // SECURITY (Req 11.2): resolve the trusted HRIMS endpoint + credentials
  // from server config. A non-allowlisted host or non-https-in-production
  // config throws `HrimsConfigError` → 400 + `HRIMS_SYNC_FAILED` audit, so
  // the server is never proxied at a caller-chosen host.
  let HRIMS_CONFIG;
  try {
    HRIMS_CONFIG = await getHrimsApiConfig();
  } catch (configError) {
    if (isHrimsConfigError(configError)) {
      await logHrimsSync({
        ...auditCommon,
        success: false,
        institutionVoteNumber,
        zanId,
        additionalData: { reason: configError.code },
      }).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          message: configError.message,
          errorCode: configError.code,
        },
        { status: 400 }
      );
    }
    throw configError;
  }

  // Validation
  if (!zanId && !payrollNumber) {
    return NextResponse.json(
      {
        success: false,
        message: 'Either ZanID or Payroll Number must be provided',
      },
      { status: 400 }
    );
  }

  if (!institutionVoteNumber) {
    return NextResponse.json(
      { success: false, message: 'Institution vote number is required' },
      { status: 400 }
    );
  }

  // Find institution by vote number
  const institution = await db.institution.findFirst({
    where: { voteNumber: institutionVoteNumber },
  });

  if (!institution) {
    await logHrimsSync({
      ...auditCommon,
      success: false,
      institutionVoteNumber,
      zanId,
      additionalData: { reason: 'institution_not_found' },
    }).catch(() => {});
    return NextResponse.json(
      { success: false, message: 'Institution not found' },
      { status: 404 }
    );
  }

  // Fetch employee data from HRIMS
  hrimsLogger.info('Fetching employee data from HRIMS...');
  const employeeResponse = await fetchFromHRIMS(
    '202',
    {
      RequestBody: zanId || payrollNumber, // Use the provided identifier
    },
    HRIMS_CONFIG
  );

  hrimsLogger.info({
    code: employeeResponse.code,
    status: employeeResponse.status,
    message: employeeResponse.message,
    hasData: !!employeeResponse.data,
    hasPersonalInfo: !!(
      employeeResponse.data && employeeResponse.data.personalInfo
    ),
  }, 'HRIMS Response received:');

  if (employeeResponse.code !== 200 || !employeeResponse.data?.personalInfo) {
    await logHrimsSync({
      ...auditCommon,
      success: false,
      institutionId: institution.id,
      institutionVoteNumber,
      zanId,
      additionalData: {
        reason: 'employee_not_found_in_hrims',
        hrimsCode: employeeResponse.code,
      },
    }).catch(() => {});
    return NextResponse.json(
      {
        success: false,
        message: employeeResponse.message || 'Employee not found in HRIMS',
      },
      { status: 404 }
    );
  }

  // Save employee to database
  hrimsLogger.info('Saving employee to database...');
  const employeeId = await saveEmployeeToDatabase(
    employeeResponse.data,
    institution.id
  );

  const personalInfo = employeeResponse.data.personalInfo;
  const employeePayrollNumber = personalInfo.payrollNumber || payrollNumber;

  // Process photo and documents in parallel
  let photoStored = false;
  let documentsCount = 0;

  if (employeePayrollNumber) {
    hrimsLogger.info(' Processing photo and documents...');

    // Run photo and documents fetch in parallel for better performance
    const [photoResult, docsCount] = await Promise.all([
      processPhoto(employeePayrollNumber, employeeId, HRIMS_CONFIG),
      processDocuments(employeePayrollNumber, employeeId, HRIMS_CONFIG),
    ]);

    photoStored = photoResult;
    documentsCount = docsCount;

    hrimsLogger.info(
      ` Completed: Photo=${photoStored ? 'stored' : 'not found'}, Documents=${documentsCount} stored`
    );
  } else {
    hrimsLogger.info(
      ' No payroll number available - skipping photo and documents fetch'
    );
  }

  const currentEmployment =
    employeeResponse.data.employmentHistories?.find(
      (emp: any) => emp.isCurrent
    ) || employeeResponse.data.employmentHistories?.[0];

  // Q8: record the fetch+store sync in the tamper-evident audit trail.
  await logHrimsSync({
    ...auditCommon,
    success: true,
    institutionId: institution.id,
    institutionVoteNumber,
    zanId: personalInfo.zanIdNumber,
    additionalData: {
      employeeId,
      photoStored,
      documentsCount,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: 'Employee data fetched and stored successfully from HRIMS',
    data: {
      Employee: {
        zanId: personalInfo.zanIdNumber,
        name: [
          personalInfo.firstName,
          personalInfo.middleName,
          personalInfo.lastName,
        ]
          .filter((name) => name && name.trim())
          .join(' '),
        payrollNumber: personalInfo.payrollNumber || '',
        cadre: currentEmployment?.titleName || 'N/A',
        status: personalInfo.isEmployeeConfirmed
          ? 'Confirmed'
          : 'On Probation',
      },
      documents: documentsCount,
      photo: photoStored,
      hrimsData: {
        employmentHistories:
          employeeResponse.data.employmentHistories?.length || 0,
        educationHistories:
          employeeResponse.data.educationHistories?.length || 0,
        salaryInformation:
          employeeResponse.data.salaryInformation?.length || 0,
      },
    },
  });
}, { allowedRoles: ['Admin', 'HHRMD', 'CSCS'] }), 'hrims-fetch-employee');

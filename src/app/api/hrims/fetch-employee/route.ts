import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/minio';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: 'http://10.0.217.11:8135/api',
  API_KEY: '0ea1e3f5-ea57-410b-a199-246fa288b851',
  TOKEN:
    'CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4',
};

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
  requestPayloadData: any
): Promise<any> {
  const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
    method: 'POST',
    headers: {
      ApiKey: HRIMS_CONFIG.API_KEY,
      Token: HRIMS_CONFIG.TOKEN,
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

    console.log('Saving employee data:', {
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      ministry: dbEmployeeData.ministry,
      cadre: dbEmployeeData.cadre,
    });

    // Save/update employee
    await db.employee.upsert({
      where: { zanId: personalInfo.zanIdNumber },
      update: dbEmployeeData,
      create: dbEmployeeData,
    });

    return employeeId;
  } catch (error) {
    console.error('Error saving employee to database:', error);
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

async function processDocuments(payrollNumber: string, employeeId: string) {
  try {
    console.log(
      `📄 Fetching documents for employee (Payroll: ${payrollNumber})`
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

        const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
          method: 'POST',
          headers: {
            ApiKey: HRIMS_CONFIG.API_KEY,
            Token: HRIMS_CONFIG.TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          console.error(
            `❌ HRIMS API error for ${docType.name}: ${response.status}`
          );
          continue;
        }

        const hrimsData = await response.json();

        // Check for HRIMS internal errors
        if (hrimsData.code === 500 || hrimsData.status === 'Failure') {
          console.error(
            `❌ HRIMS internal error for ${docType.name}:`,
            hrimsData.message
          );
          continue;
        }

        // Extract attachments
        const attachments = Array.isArray(hrimsData.data) ? hrimsData.data : [];
        if (attachments.length === 0) {
          console.log(`⚠️ No ${docType.name} found`);
          continue;
        }

        // Take first attachment (most recent)
        const doc = attachments[0];

        // Convert base64 to buffer and upload to MinIO
        const buffer = Buffer.from(doc.content, 'base64');
        const fileName = `${employeeId}_${docType.dbKey}.pdf`;
        const filePath = `employee-documents/${fileName}`;

        await uploadFile(buffer, filePath, 'application/pdf');
        console.log(`✅ Uploaded ${docType.name} to MinIO: ${filePath}`);

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
        console.error(`Error processing ${docType.name}:`, error);
      }
    }

    return savedDocuments;
  } catch (error) {
    console.error('Error processing documents:', error);
    return 0;
  }
}

async function processPhoto(payrollNumber: string, employeeId: string) {
  try {
    console.log(`📸 Fetching photo for employee (Payroll: ${payrollNumber})`);

    const photoPayload = {
      RequestId: '203',
      SearchCriteria: payrollNumber,
    };

    const photoResponse = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        ApiKey: HRIMS_CONFIG.API_KEY,
        Token: HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoPayload),
      signal: AbortSignal.timeout(30000),
    });

    if (!photoResponse.ok) {
      console.error(`❌ HRIMS API error for photo: ${photoResponse.status}`);
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
      console.log('⚠️ No photo data in HRIMS response');
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
    console.log(`✅ Photo uploaded to MinIO: ${filePath}`);

    // Store MinIO URL in database
    const minioUrl = `/api/files/employee-photos/${fileName}`;
    await db.employee.update({
      where: { id: employeeId },
      data: { profileImageUrl: minioUrl },
    });

    return true;
  } catch (error) {
    console.error('Error processing photo:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zanId, payrollNumber, institutionVoteNumber } = body;

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
      return NextResponse.json(
        { success: false, message: 'Institution not found' },
        { status: 404 }
      );
    }

    // Fetch employee data from HRIMS
    console.log('Fetching employee data from HRIMS...');
    const employeeResponse = await fetchFromHRIMS('202', {
      RequestBody: zanId || payrollNumber, // Use the provided identifier
    });

    console.log('HRIMS Response received:', {
      code: employeeResponse.code,
      status: employeeResponse.status,
      message: employeeResponse.message,
      hasData: !!employeeResponse.data,
      hasPersonalInfo: !!(
        employeeResponse.data && employeeResponse.data.personalInfo
      ),
    });

    if (employeeResponse.code !== 200 || !employeeResponse.data?.personalInfo) {
      return NextResponse.json(
        {
          success: false,
          message: employeeResponse.message || 'Employee not found in HRIMS',
        },
        { status: 404 }
      );
    }

    // Save employee to database
    console.log('Saving employee to database...');
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
      console.log('📦 Processing photo and documents...');

      // Run photo and documents fetch in parallel for better performance
      const [photoResult, docsCount] = await Promise.all([
        processPhoto(employeePayrollNumber, employeeId),
        processDocuments(employeePayrollNumber, employeeId),
      ]);

      photoStored = photoResult;
      documentsCount = docsCount;

      console.log(
        `✅ Completed: Photo=${photoStored ? 'stored' : 'not found'}, Documents=${documentsCount} stored`
      );
    } else {
      console.log(
        '⚠️ No payroll number available - skipping photo and documents fetch'
      );
    }

    const currentEmployment =
      employeeResponse.data.employmentHistories?.find(
        (emp: any) => emp.isCurrent
      ) || employeeResponse.data.employmentHistories?.[0];

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
  } catch (error) {
    console.error('Error in HRIMS fetch-employee API:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

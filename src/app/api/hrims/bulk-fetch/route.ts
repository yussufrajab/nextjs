import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: 'http://10.0.217.11:8135/api',
  API_KEY: '0ea1e3f5-ea57-410b-a199-246fa288b851',
  TOKEN:
    'CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4',
};

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

async function saveEmployeeFromDetailedData(
  hrimsData: any,
  institutionId: string
) {
  try {
    const personalInfo = hrimsData.personalInfo;
    const currentEmployment =
      hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) ||
      hrimsData.employmentHistories?.[0];
    const currentSalary =
      hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) ||
      hrimsData.salaryInformation?.[0];

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

    // Map detailed HRIMS data to our database structure
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
      contractType: null,
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
      employeeEntityId: personalInfo.zanIdNumber,
    };

    // Save/update employee
    await db.employee.upsert({
      where: { zanId: personalInfo.zanIdNumber },
      update: dbEmployeeData,
      create: dbEmployeeData,
    });

    return employeeId;
  } catch (error) {
    console.error('Error saving detailed employee data:', error);
    throw error;
  }
}

async function saveEmployeeFromListData(
  employeeBasicInfo: any,
  institutionId: string
) {
  try {
    // Skip employees without valid ZanID
    if (
      !employeeBasicInfo.zanIdNumber ||
      employeeBasicInfo.zanIdNumber.trim() === ''
    ) {
      console.log(
        `Skipping employee without ZanID: ${employeeBasicInfo.firstName} ${employeeBasicInfo.lastName}`
      );
      return null;
    }

    // Find or create employee
    const existingEmployee = await db.employee.findUnique({
      where: { zanId: employeeBasicInfo.zanIdNumber },
    });

    const employeeId = existingEmployee?.id || uuidv4();

    // Build full name
    const fullName = [
      employeeBasicInfo.firstName,
      employeeBasicInfo.middleName,
      employeeBasicInfo.lastName,
    ]
      .filter((name) => name && name.trim())
      .join(' ');

    // Map list format HRIMS data to our database structure
    const dbEmployeeData = {
      id: employeeId,
      name: fullName,
      gender:
        employeeBasicInfo.genderName === 'Mwanamme'
          ? 'Male'
          : employeeBasicInfo.genderName === 'Mwanamke'
            ? 'Female'
            : employeeBasicInfo.genderName,
      dateOfBirth: employeeBasicInfo.birthDate
        ? new Date(employeeBasicInfo.birthDate)
        : null,
      placeOfBirth: employeeBasicInfo.placeOfBirth,
      region: employeeBasicInfo.regionName,
      countryOfBirth: employeeBasicInfo.birthCountryName,
      zanId: employeeBasicInfo.zanIdNumber,
      phoneNumber:
        employeeBasicInfo.primaryPhone || employeeBasicInfo.workPhone,
      contactAddress:
        [
          employeeBasicInfo.houseNumber,
          employeeBasicInfo.street,
          employeeBasicInfo.city,
        ]
          .filter((part) => part && part.trim())
          .join(', ') || null,
      zssfNumber: employeeBasicInfo.zssfNumber,
      payrollNumber: employeeBasicInfo.payrollNumber || '',
      cadre: null, // Not available in list format
      salaryScale: null, // Not available in list format
      ministry: null, // Not available in list format
      department: null, // Not available in list format
      appointmentType: null, // Not available in list format
      contractType: null,
      recentTitleDate: null, // Not available in list format
      currentReportingOffice: null, // Not available in list format
      currentWorkplace: null, // Not available in list format
      employmentDate: employeeBasicInfo.employmentDate
        ? new Date(employeeBasicInfo.employmentDate)
        : null,
      confirmationDate: employeeBasicInfo.employmentConfirmationDate
        ? new Date(employeeBasicInfo.employmentConfirmationDate)
        : null,
      retirementDate: null, // Not available in list format
      status: employeeBasicInfo.isEmployeeConfirmed
        ? 'Confirmed'
        : 'On Probation',
      institutionId: institutionId,
      employeeEntityId: employeeBasicInfo.zanIdNumber,
    };

    console.log('Saving employee from list data:', {
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      status: dbEmployeeData.status,
    });

    // Save/update employee
    await db.employee.upsert({
      where: { zanId: employeeBasicInfo.zanIdNumber },
      update: dbEmployeeData,
      create: dbEmployeeData,
    });

    return employeeId;
  } catch (error) {
    console.error('Error saving employee from list data:', error);
    throw error;
  }
}

async function processEmployeeDocuments(
  zanId: string,
  payrollNumber: string,
  employeeId: string
) {
  try {
    // Fetch documents
    const documentsResponse = await fetchFromHRIMS('202', {
      RequestBody: payrollNumber || zanId,
    });

    if (!documentsResponse.success || !documentsResponse.data?.documents) {
      return 0;
    }

    let savedDocuments = 0;
    for (const doc of documentsResponse.data.documents) {
      try {
        const documentTypeMap: { [key: string]: string } = {
          ardhilHali: 'ardhilHaliUrl',
          confirmationLetter: 'confirmationLetterUrl',
          jobContract: 'jobContractUrl',
          birthCertificate: 'birthCertificateUrl',
        };

        const fieldName = documentTypeMap[doc.type];
        if (!fieldName) continue;

        const documentUrl = `data:${doc.contentType};base64,${doc.content}`;

        await db.employee.update({
          where: { id: employeeId },
          data: { [fieldName]: documentUrl },
        });

        savedDocuments++;
      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error);
      }
    }

    return savedDocuments;
  } catch (error) {
    console.error('Error processing documents:', error);
    return 0;
  }
}

async function processEmployeeCertificates(
  zanId: string,
  payrollNumber: string,
  employeeId: string
) {
  try {
    // Fetch certificates
    const certificatesResponse = await fetchFromHRIMS('203', {
      RequestBody: payrollNumber || zanId,
    });

    if (
      !certificatesResponse.success ||
      !certificatesResponse.data?.certificates
    ) {
      return 0;
    }

    let savedCertificates = 0;
    for (const cert of certificatesResponse.data.certificates) {
      try {
        await db.employeeCertificate.create({
          data: {
            id: uuidv4(),
            employeeId: employeeId,
            type: cert.type,
            name: cert.name,
            url: `data:${cert.contentType};base64,${cert.content}`,
          },
        });

        savedCertificates++;
      } catch (error) {
        console.error(`Error processing certificate ${cert.id}:`, error);
      }
    }

    return savedCertificates;
  } catch (error) {
    console.error('Error processing certificates:', error);
    return 0;
  }
}

async function processBulkFetch(
  institutionVoteNumber: string,
  institutionId: string,
  fetchMode: 'fast' | 'detailed' = 'fast'
) {
  let totalEmployees = 0;
  const totalDocuments = 0;
  const totalCertificates = 0;
  let page = 0;
  let hasMoreData = true;

  console.log(
    `Starting bulk fetch for institution vote number: ${institutionVoteNumber} in ${fetchMode} mode`
  );

  try {
    while (hasMoreData) {
      console.log(`Fetching page ${page} of employees...`);

      // Fetch employees page using RequestId 201
      const employeeListResponse = await fetchFromHRIMS('201', {
        PageNumber: page,
        PageSize: fetchMode === 'fast' ? 100 : 50, // Larger batches for fast mode
      });

      console.log(`Page ${page} response:`, {
        code: employeeListResponse.code,
        status: employeeListResponse.status,
        hasData: !!employeeListResponse.data,
        currentDataSize: employeeListResponse.currentDataSize,
        overallDataSize: employeeListResponse.overallDataSize,
      });

      // Check if we have data
      if (
        employeeListResponse.code !== 200 ||
        !employeeListResponse.data ||
        employeeListResponse.data.length === 0
      ) {
        console.log('No more employee data available');
        break;
      }

      console.log(
        `Processing ${employeeListResponse.data.length} employees from page ${page}`
      );

      if (fetchMode === 'fast') {
        // Fast mode: Save employees directly from list data
        for (const employeeBasicInfo of employeeListResponse.data) {
          try {
            const employeeId = await saveEmployeeFromListData(
              employeeBasicInfo,
              institutionId
            );
            if (employeeId) {
              totalEmployees++;
              console.log(
                `✅ Saved employee (fast): ${employeeBasicInfo.firstName} ${employeeBasicInfo.lastName} (${employeeBasicInfo.zanIdNumber})`
              );
            }

            // Very small delay for fast processing
            await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay
          } catch (error) {
            console.error(
              `Error processing employee ${employeeBasicInfo.zanIdNumber}:`,
              error
            );
          }
        }
      } else {
        // Detailed mode: Fetch full details for each employee
        for (const employeeBasicInfo of employeeListResponse.data) {
          try {
            // Skip employees without valid ZanID
            if (
              !employeeBasicInfo.zanIdNumber ||
              employeeBasicInfo.zanIdNumber.trim() === ''
            ) {
              console.log(
                `Skipping employee without ZanID: ${employeeBasicInfo.firstName} ${employeeBasicInfo.lastName}`
              );
              continue;
            }

            console.log(
              `Fetching detailed data for: ${employeeBasicInfo.firstName} ${employeeBasicInfo.lastName} (${employeeBasicInfo.zanIdNumber})`
            );

            // Fetch detailed employee data using RequestId 202
            const detailedResponse = await fetchFromHRIMS('202', {
              RequestBody: employeeBasicInfo.zanIdNumber,
            });

            if (
              detailedResponse.code === 200 &&
              detailedResponse.data?.personalInfo
            ) {
              // Save employee to database with detailed info
              const employeeId = await saveEmployeeFromDetailedData(
                detailedResponse.data,
                institutionId
              );
              totalEmployees++;

              console.log(
                `✅ Saved employee (detailed): ${detailedResponse.data.personalInfo.firstName} ${detailedResponse.data.personalInfo.lastName}`
              );

              // Skip documents and certificates for bulk processing to improve performance
              // These can be fetched separately if needed
            } else {
              console.log(
                `❌ Failed to fetch detailed data for ${employeeBasicInfo.zanIdNumber}: ${detailedResponse.message || 'Unknown error'}`
              );
            }

            // Add a delay to avoid overwhelming the HRIMS system
            await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
          } catch (error) {
            console.error(
              `Error processing employee ${employeeBasicInfo.zanIdNumber}:`,
              error
            );
          }
        }
      }

      // Check if we should continue to next page
      const batchSize = fetchMode === 'fast' ? 100 : 50;
      if (employeeListResponse.data.length < batchSize) {
        // We got less than the page size, so this is likely the last page
        hasMoreData = false;
      } else {
        page++;
        // Add a longer delay between pages
        await new Promise((resolve) =>
          setTimeout(resolve, fetchMode === 'fast' ? 500 : 1000)
        );
      }
    }

    return {
      totalEmployees,
      totalDocuments,
      totalCertificates,
      fetchMode,
      note:
        fetchMode === 'fast'
          ? 'Fast mode: Basic employee info saved. Use detailed mode for employment history and job details.'
          : 'Detailed mode: Complete employee profiles with employment history saved.',
    };
  } catch (error) {
    console.error('Error in bulk fetch:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { institutionVoteNumber } = body;

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

    // Start bulk fetch process in the background
    console.log(
      `Starting bulk fetch for Institution: ${institution.name} (${institutionVoteNumber})`
    );

    // Note: In a production environment, you would typically use a job queue system
    // like Bull, Agenda, or a background worker service for this kind of operation
    processBulkFetch(institutionVoteNumber, institution.id)
      .then((result) => {
        console.log(`Bulk fetch completed for ${institution.name}:`, result);
      })
      .catch((error) => {
        console.error(`Bulk fetch failed for ${institution.name}:`, error);
      });

    return NextResponse.json({
      success: true,
      message: `Bulk fetch started for ${institution.name}. This process will continue in the background.`,
      data: {
        institutionName: institution.name,
        institutionVoteNumber,
        status: 'started',
      },
    });
  } catch (error) {
    console.error('Error in HRIMS bulk-fetch API:', error);

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

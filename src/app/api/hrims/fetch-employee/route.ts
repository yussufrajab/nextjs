import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

interface HRIMSEmployeeResponse {
  success: boolean;
  message: string;
  data?: {
    employee: {
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

async function fetchFromHRIMS(requestId: string, requestPayloadData: any): Promise<any> {
  const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
    method: 'POST',
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RequestId: requestId,
      RequestPayloadData: requestPayloadData
    })
  });

  if (!response.ok) {
    throw new Error(`HRIMS API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function saveEmployeeToDatabase(hrimsData: any, institutionId: string) {
  try {
    const personalInfo = hrimsData.personalInfo;
    const currentEmployment = hrimsData.employmentHistories?.find((emp: any) => emp.isCurrent) || hrimsData.employmentHistories?.[0];
    const currentSalary = hrimsData.salaryInformation?.find((sal: any) => sal.isCurrent) || hrimsData.salaryInformation?.[0];
    const highestEducation = hrimsData.educationHistories?.[0];

    // Find or create employee
    const existingEmployee = await db.employee.findUnique({
      where: { zanId: personalInfo.zanIdNumber }
    });

    const employeeId = existingEmployee?.id || uuidv4();

    // Build full name
    const fullName = [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
      .filter(name => name && name.trim())
      .join(' ');

    // Map HRIMS data to our database structure
    const dbEmployeeData = {
      id: employeeId,
      name: fullName,
      gender: personalInfo.genderName === 'Mwanamme' ? 'Male' : personalInfo.genderName === 'Mwanamke' ? 'Female' : personalInfo.genderName,
      dateOfBirth: personalInfo.birthDate ? new Date(personalInfo.birthDate) : null,
      placeOfBirth: personalInfo.placeOfBirth,
      region: personalInfo.regionName,
      countryOfBirth: personalInfo.birthCountryName,
      zanId: personalInfo.zanIdNumber,
      phoneNumber: personalInfo.primaryPhone || personalInfo.workPhone,
      contactAddress: [personalInfo.houseNumber, personalInfo.street, personalInfo.city]
        .filter(part => part && part.trim())
        .join(', ') || null,
      zssfNumber: personalInfo.zssfNumber,
      payrollNumber: personalInfo.payrollNumber || '',
      cadre: currentEmployment?.titleName,
      salaryScale: currentSalary?.salaryScaleName,
      ministry: currentEmployment?.entityName,
      department: currentEmployment?.subEntityName,
      appointmentType: currentEmployment?.appointmentTypeName,
      contractType: null, // Not available in HRIMS data
      recentTitleDate: currentEmployment?.fromDate ? new Date(currentEmployment.fromDate) : null,
      currentReportingOffice: currentEmployment?.subEntityName,
      currentWorkplace: currentEmployment?.entityName,
      employmentDate: personalInfo.employmentDate ? new Date(personalInfo.employmentDate) : null,
      confirmationDate: personalInfo.employmentConfirmationDate ? new Date(personalInfo.employmentConfirmationDate) : null,
      retirementDate: currentEmployment?.toDate ? new Date(currentEmployment.toDate) : null,
      status: personalInfo.isEmployeeConfirmed ? 'Confirmed' : 'On Probation',
      institutionId: institutionId,
      // Store additional HRIMS-specific data
      employeeEntityId: personalInfo.zanIdNumber, // Use ZanID as entity ID
    };

    console.log('Saving employee data:', {
      zanId: dbEmployeeData.zanId,
      name: dbEmployeeData.name,
      ministry: dbEmployeeData.ministry,
      cadre: dbEmployeeData.cadre
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

async function processDocuments(zanId: string, payrollNumber: string, employeeId: string, institutionVoteNumber: string) {
  try {
    // Fetch documents from HRIMS
    const documentsResponse = await fetchFromHRIMS("202", {
      RequestBody: payrollNumber || zanId
    });

    if (!documentsResponse.success || !documentsResponse.data?.documents) {
      return 0;
    }

    let savedDocuments = 0;

    for (const doc of documentsResponse.data.documents) {
      try {
        // Map HRIMS document types to our system
        const documentTypeMap: { [key: string]: string } = {
          'ardhilHali': 'ardhilHaliUrl',
          'confirmationLetter': 'confirmationLetterUrl',
          'jobContract': 'jobContractUrl',
          'birthCertificate': 'birthCertificateUrl'
        };

        const fieldName = documentTypeMap[doc.type];
        if (!fieldName) continue;

        // Convert base64 to file and upload to storage
        // For now, we'll store the base64 content directly
        // In production, you would upload to MinIO or another storage service

        const fileName = `${employeeId}_${doc.type}_${Date.now()}.pdf`;
        const documentUrl = `data:${doc.contentType};base64,${doc.content}`;

        // Update employee record with document URL
        await db.employee.update({
          where: { id: employeeId },
          data: {
            [fieldName]: documentUrl
          }
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

async function processCertificates(zanId: string, payrollNumber: string, employeeId: string, institutionVoteNumber: string) {
  try {
    // Fetch certificates from HRIMS
    const certificatesResponse = await fetchFromHRIMS("203", {
      RequestBody: payrollNumber || zanId
    });

    if (!certificatesResponse.success || !certificatesResponse.data?.certificates) {
      return 0;
    }

    let savedCertificates = 0;

    for (const cert of certificatesResponse.data.certificates) {
      try {
        // Save certificate to database
        await db.employeeCertificate.create({
          data: {
            id: uuidv4(),
            employeeId: employeeId,
            type: cert.type,
            name: cert.name,
            url: `data:${cert.contentType};base64,${cert.content}`,
          }
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zanId, payrollNumber, institutionVoteNumber } = body;

    // Validation
    if (!zanId && !payrollNumber) {
      return NextResponse.json(
        { success: false, message: 'Either ZanID or Payroll Number must be provided' },
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
      where: { voteNumber: institutionVoteNumber }
    });

    if (!institution) {
      return NextResponse.json(
        { success: false, message: 'Institution not found' },
        { status: 404 }
      );
    }

    // Fetch employee data from HRIMS
    console.log('Fetching employee data from HRIMS...');
    const employeeResponse = await fetchFromHRIMS("202", {
      RequestBody: zanId || payrollNumber // Use the provided identifier
    });

    console.log('HRIMS Response received:', {
      code: employeeResponse.code,
      status: employeeResponse.status,
      message: employeeResponse.message,
      hasData: !!employeeResponse.data,
      hasPersonalInfo: !!(employeeResponse.data && employeeResponse.data.personalInfo)
    });

    if (employeeResponse.code !== 200 || !employeeResponse.data?.personalInfo) {
      return NextResponse.json(
        { success: false, message: employeeResponse.message || 'Employee not found in HRIMS' },
        { status: 404 }
      );
    }

    // Save employee to database
    console.log('Saving employee to database...');
    const employeeId = await saveEmployeeToDatabase(employeeResponse.data, institution.id);

    // Process documents in background (skip for now as format may be different)
    console.log('Skipping documents processing - will implement after testing basic employee fetch');
    const documentsCount = 0;

    // Process certificates in background (skip for now as format may be different)
    console.log('Skipping certificates processing - will implement after testing basic employee fetch');
    const certificatesCount = 0;

    const personalInfo = employeeResponse.data.personalInfo;
    const currentEmployment = employeeResponse.data.employmentHistories?.find((emp: any) => emp.isCurrent) || employeeResponse.data.employmentHistories?.[0];

    return NextResponse.json({
      success: true,
      message: 'Employee data fetched and stored successfully from HRIMS',
      data: {
        employee: {
          zanId: personalInfo.zanIdNumber,
          name: [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName]
            .filter(name => name && name.trim())
            .join(' '),
          payrollNumber: personalInfo.payrollNumber || '',
          cadre: currentEmployment?.titleName || 'N/A',
          status: personalInfo.isEmployeeConfirmed ? 'Confirmed' : 'On Probation',
        },
        documents: documentsCount,
        certificates: certificatesCount,
        hrimsData: {
          employmentHistories: employeeResponse.data.employmentHistories?.length || 0,
          educationHistories: employeeResponse.data.educationHistories?.length || 0,
          salaryInformation: employeeResponse.data.salaryInformation?.length || 0,
        }
      }
    });

  } catch (error) {
    console.error('Error in HRIMS fetch-employee API:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
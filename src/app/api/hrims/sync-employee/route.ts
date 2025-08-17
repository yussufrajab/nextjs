import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for the HRIMS sync request
const hrimsRequestSchema = z.object({
  zanId: z.string().optional(),
  payrollNumber: z.string().optional(),
  institutionVoteNumber: z.string(),
  hrimsApiUrl: z.string().url().optional(), // External HRIMS API URL
  hrimsApiKey: z.string().optional(), // API key for HRIMS authentication
}).refine(
  (data) => data.zanId || data.payrollNumber,
  {
    message: "Either zanId or payrollNumber must be provided",
    path: ["zanId", "payrollNumber"],
  }
);

// Schema for expected HRIMS employee response
const hrimsEmployeeResponseSchema = z.object({
  employee: z.object({
    zanId: z.string(),
    payrollNumber: z.string().optional(),
    name: z.string(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    placeOfBirth: z.string().optional(),
    region: z.string().optional(),
    countryOfBirth: z.string().optional(),
    phoneNumber: z.string().optional(),
    contactAddress: z.string().optional(),
    zssfNumber: z.string().optional(),
    cadre: z.string().optional(),
    salaryScale: z.string().optional(),
    ministry: z.string().optional(),
    department: z.string().optional(),
    appointmentType: z.string().optional(),
    contractType: z.string().optional(),
    recentTitleDate: z.string().optional(),
    currentReportingOffice: z.string().optional(),
    currentWorkplace: z.string().optional(),
    employmentDate: z.string().optional(),
    confirmationDate: z.string().optional(),
    retirementDate: z.string().optional(),
    status: z.string().optional(),
    institutionVoteNumber: z.string(),
  }),
  documents: z.array(z.object({
    type: z.enum(['ardhilHali', 'confirmationLetter', 'jobContract', 'birthCertificate']),
    url: z.string().url(),
    name: z.string().optional(),
  })).optional(),
  certificates: z.array(z.object({
    type: z.string(),
    name: z.string(),
    url: z.string().url(),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('HRIMS sync request received:', { ...body, hrimsApiKey: '[REDACTED]' });

    // Validate request payload
    const validatedRequest = hrimsRequestSchema.parse(body);

    // Find institution by vote number
    const institution = await db.institution.findFirst({
      where: {
        voteNumber: validatedRequest.institutionVoteNumber
      }
    });

    if (!institution) {
      return NextResponse.json({
        success: false,
        message: `Institution with vote number ${validatedRequest.institutionVoteNumber} not found`
      }, { status: 404 });
    }

    // Fetch employee data from HRIMS
    const hrimsData = await fetchEmployeeFromHRIMS(validatedRequest);
    
    if (!hrimsData) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found in HRIMS system'
      }, { status: 404 });
    }

    // Validate HRIMS response
    const validatedHrimsData = hrimsEmployeeResponseSchema.parse(hrimsData);

    // Store/Update employee in database
    const savedEmployee = await upsertEmployeeFromHRIMS(validatedHrimsData, institution.id);

    console.log('Employee synced successfully:', savedEmployee.id);

    return NextResponse.json({
      success: true,
      message: 'Employee data synced successfully from HRIMS',
      data: {
        employeeId: savedEmployee.id,
        zanId: savedEmployee.zanId,
        name: savedEmployee.name,
        institutionId: savedEmployee.institutionId,
        documentsCount: validatedHrimsData.documents?.length || 0,
        certificatesCount: validatedHrimsData.certificates?.length || 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error("[HRIMS_SYNC_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error during HRIMS sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to fetch employee data from external HRIMS system
async function fetchEmployeeFromHRIMS(request: z.infer<typeof hrimsRequestSchema>) {
  try {
    // For demo purposes - replace with actual HRIMS API endpoint
    const hrimsApiUrl = request.hrimsApiUrl || process.env.HRIMS_API_URL || 'https://hrims-api.example.com';
    const hrimsApiKey = request.hrimsApiKey || process.env.HRIMS_API_KEY;

    const searchParams = new URLSearchParams();
    if (request.zanId) searchParams.append('zanId', request.zanId);
    if (request.payrollNumber) searchParams.append('payrollNumber', request.payrollNumber);
    searchParams.append('institutionVoteNumber', request.institutionVoteNumber);

    const response = await fetch(`${hrimsApiUrl}/api/employee/search?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hrimsApiKey}`,
        'X-API-Key': hrimsApiKey || '',
      },
      timeout: 30000, // 30 seconds timeout
    });

    if (!response.ok) {
      console.error(`HRIMS API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('HRIMS API response received');
    return data;

  } catch (error) {
    console.error('Error fetching from HRIMS:', error);
    
    // For development/demo - return mock data
    if (process.env.NODE_ENV === 'development' || process.env.HRIMS_MOCK_MODE === 'true') {
      console.log('Using mock HRIMS data for development');
      return getMockHRIMSData(request);
    }
    
    throw error;
  }
}

// Function to upsert employee data into the database
async function upsertEmployeeFromHRIMS(
  hrimsData: z.infer<typeof hrimsEmployeeResponseSchema>,
  institutionId: string
) {
  const { employee, documents, certificates } = hrimsData;

  // Check if employee already exists
  const existingEmployee = await db.employee.findFirst({
    where: {
      zanId: employee.zanId
    }
  });

  const employeeData = {
    zanId: employee.zanId,
    name: employee.name,
    gender: employee.gender || null,
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
    placeOfBirth: employee.placeOfBirth || null,
    region: employee.region || null,
    countryOfBirth: employee.countryOfBirth || null,
    phoneNumber: employee.phoneNumber || null,
    contactAddress: employee.contactAddress || null,
    zssfNumber: employee.zssfNumber || null,
    payrollNumber: employee.payrollNumber || null,
    cadre: employee.cadre || null,
    salaryScale: employee.salaryScale || null,
    ministry: employee.ministry || null,
    department: employee.department || null,
    appointmentType: employee.appointmentType || null,
    contractType: employee.contractType || null,
    recentTitleDate: employee.recentTitleDate ? new Date(employee.recentTitleDate) : null,
    currentReportingOffice: employee.currentReportingOffice || null,
    currentWorkplace: employee.currentWorkplace || null,
    employmentDate: employee.employmentDate ? new Date(employee.employmentDate) : null,
    confirmationDate: employee.confirmationDate ? new Date(employee.confirmationDate) : null,
    retirementDate: employee.retirementDate ? new Date(employee.retirementDate) : null,
    status: employee.status || null,
    institutionId: institutionId,
  };

  // Handle document URLs
  const documentUrls = {
    ardhilHaliUrl: documents?.find(d => d.type === 'ardhilHali')?.url || null,
    confirmationLetterUrl: documents?.find(d => d.type === 'confirmationLetter')?.url || null,
    jobContractUrl: documents?.find(d => d.type === 'jobContract')?.url || null,
    birthCertificateUrl: documents?.find(d => d.type === 'birthCertificate')?.url || null,
  };

  let savedEmployee;

  if (existingEmployee) {
    // Update existing employee
    savedEmployee = await db.employee.update({
      where: { id: existingEmployee.id },
      data: { ...employeeData, ...documentUrls }
    });
  } else {
    // Create new employee
    savedEmployee = await db.employee.create({
      data: { ...employeeData, ...documentUrls }
    });
  }

  // Handle certificates
  if (certificates && certificates.length > 0) {
    // Delete existing certificates for this employee
    await db.employeeCertificate.deleteMany({
      where: { employeeId: savedEmployee.id }
    });

    // Create new certificates
    await db.employeeCertificate.createMany({
      data: certificates.map(cert => ({
        employeeId: savedEmployee.id,
        type: cert.type,
        name: cert.name,
        url: cert.url
      }))
    });
  }

  return savedEmployee;
}

// Mock data for development/testing
function getMockHRIMSData(request: z.infer<typeof hrimsRequestSchema>) {
  return {
    employee: {
      zanId: request.zanId || "Z123456789",
      payrollNumber: request.payrollNumber || "PAY001234",
      name: "John Doe Mwalimu",
      gender: "Male",
      dateOfBirth: "1990-05-15",
      placeOfBirth: "Stone Town",
      region: "Zanzibar Urban",
      countryOfBirth: "Tanzania",
      phoneNumber: "+255777123456",
      contactAddress: "P.O. Box 123, Stone Town, Zanzibar",
      zssfNumber: "ZSSF123456",
      cadre: "Administrative Officer",
      salaryScale: "PGSS 7",
      ministry: "Ministry of Health",
      department: "Human Resources",
      appointmentType: "Permanent",
      contractType: "Full-time",
      recentTitleDate: "2023-01-01",
      currentReportingOffice: "HR Department",
      currentWorkplace: "Mnazi Mmoja Hospital",
      employmentDate: "2020-03-01",
      confirmationDate: "2021-03-01",
      retirementDate: "2055-05-15",
      status: "Active",
      institutionVoteNumber: request.institutionVoteNumber
    },
    documents: [
      {
        type: "ardhilHali" as const,
        url: "https://example.com/documents/ardhil-hali-123.pdf",
        name: "Ardhil Hali Certificate"
      },
      {
        type: "confirmationLetter" as const,
        url: "https://example.com/documents/confirmation-123.pdf", 
        name: "Confirmation Letter"
      },
      {
        type: "jobContract" as const,
        url: "https://example.com/documents/contract-123.pdf",
        name: "Employment Contract"
      }
    ],
    certificates: [
      {
        type: "Bachelor Degree",
        name: "Bachelor of Arts in Administration",
        url: "https://example.com/certificates/bachelor-123.pdf"
      },
      {
        type: "Certificate",
        name: "Public Administration Certificate",
        url: "https://example.com/certificates/cert-123.pdf"
      }
    ]
  };
}
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Validation schema for the HRIMS sync request
const hrimsRequestSchema = z.object({
  zanId: z.string().optional(),
  payrollNumber: z.string().optional(),
  institutionVoteNumber: z.string(),
  syncDocuments: z.boolean().optional().default(false), // Default false for two-API approach
  hrimsApiUrl: z.string().url().optional(), // External HRIMS API URL
  hrimsApiKey: z.string().optional(), // API key for HRIMS authentication
}).refine(
  (data) => data.zanId || data.payrollNumber,
  {
    message: "Either zanId or payrollNumber must be provided",
    path: ["zanId", "payrollNumber"],
  }
);

// Schema for expected HRIMS employee response (core data only)
const hrimsEmployeeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    Employee: z.object({
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
      photo: z.object({
        contentType: z.string(),
        content: z.string(),
        lastUpdated: z.string().optional(),
      }).optional(),
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
      documentStats: z.object({
        totalDocuments: z.number(),
        totalCertificates: z.number(),
      }).optional(),
    }),
  }),
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

    const documentStats = validatedHrimsData.data.Employee.documentStats;
    
    // Trigger background sync for documents and certificates if they exist
    const backgroundTasks = [];
    
    if ((documentStats?.totalDocuments ?? 0) > 0) {
      // Trigger documents sync in background
      backgroundTasks.push(
        triggerBackgroundDocumentsSync(validatedRequest, validatedHrimsData.data.Employee.zanId)
      );
    }

    if ((documentStats?.totalCertificates ?? 0) > 0) {
      // Trigger certificates sync in background
      backgroundTasks.push(
        triggerBackgroundCertificatesSync(validatedRequest, validatedHrimsData.data.Employee.zanId)
      );
    }

    // Start background tasks without waiting for them to complete
    if (backgroundTasks.length > 0) {
      Promise.all(backgroundTasks).catch(error => {
        console.error('Background sync error:', error);
        // Background tasks failing shouldn't affect the main response
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Employee data synced successfully from HRIMS',
      data: {
        employeeId: savedEmployee.id,
        zanId: savedEmployee.zanId,
        name: savedEmployee.name,
        institutionId: savedEmployee.institutionId,
        documentsCount: documentStats?.totalDocuments || 0,
        certificatesCount: documentStats?.totalCertificates || 0,
        documentsStatus: (documentStats?.totalDocuments ?? 0) > 0 ? "syncing" : "completed", // Status based on background sync
        certificatesStatus: (documentStats?.totalCertificates ?? 0) > 0 ? "syncing" : "completed" // Status based on background sync
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
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
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
  const { Employee } = hrimsData.data;

  // Check if employee already exists
  const existingEmployee = await db.employee.findFirst({
    where: {
      zanId: Employee.zanId
    }
  });

  const employeeData = {
    zanId: Employee.zanId,
    name: Employee.name,
    gender: Employee.gender || null,
    dateOfBirth: Employee.dateOfBirth ? new Date(Employee.dateOfBirth) : null,
    placeOfBirth: Employee.placeOfBirth || null,
    region: Employee.region || null,
    countryOfBirth: Employee.countryOfBirth || null,
    phoneNumber: Employee.phoneNumber || null,
    contactAddress: Employee.contactAddress || null,
    zssfNumber: Employee.zssfNumber || null,
    payrollNumber: Employee.payrollNumber || null,
    cadre: Employee.cadre || null,
    salaryScale: Employee.salaryScale || null,
    ministry: Employee.ministry || null,
    department: Employee.department || null,
    appointmentType: Employee.appointmentType || null,
    contractType: Employee.contractType || null,
    recentTitleDate: Employee.recentTitleDate ? new Date(Employee.recentTitleDate) : null,
    currentReportingOffice: Employee.currentReportingOffice || null,
    currentWorkplace: Employee.currentWorkplace || null,
    employmentDate: Employee.employmentDate ? new Date(Employee.employmentDate) : null,
    confirmationDate: Employee.confirmationDate ? new Date(Employee.confirmationDate) : null,
    retirementDate: Employee.retirementDate ? new Date(Employee.retirementDate) : null,
    status: Employee.status || null,
    institutionId: institutionId,
    profileImageUrl: Employee.photo?.content ? `data:${Employee.photo.contentType};base64,${Employee.photo.content}` : null,
  };

  let savedEmployee;

  if (existingEmployee) {
    // Update existing employee
    savedEmployee = await db.employee.update({
      where: { id: existingEmployee.id },
      data: employeeData as any
    });
  } else {
    // Create new employee
    savedEmployee = await db.employee.create({
      data: {
        id: uuidv4(),
        ...employeeData
      } as any
    });
  }

  return savedEmployee;
}

// Mock data for development/testing
function getMockHRIMSData(request: z.infer<typeof hrimsRequestSchema>) {
  return {
    success: true,
    message: "Employee found successfully",
    data: {
      Employee: {
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
        photo: {
          contentType: "image/jpeg",
          content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          lastUpdated: "2025-08-15"
        },
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
        institutionVoteNumber: request.institutionVoteNumber,
        documentStats: {
          totalDocuments: 3,
          totalCertificates: 5
        }
      }
    }
  };
}

// Background sync functions
async function triggerBackgroundDocumentsSync(
  request: z.infer<typeof hrimsRequestSchema>,
  zanId: string
) {
  try {
    console.log(`Starting background documents sync for Employee: ${zanId}`);
    
    const syncPayload = {
      zanId: zanId,
      institutionVoteNumber: request.institutionVoteNumber,
      hrimsApiUrl: request.hrimsApiUrl,
      hrimsApiKey: request.hrimsApiKey,
    };

    // Use the internal API base URL for background sync
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const response = await fetch(`${baseUrl}/api/hrims/sync-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncPayload),
    });

    if (response.ok) {
      console.log(`Documents sync completed for Employee: ${zanId}`);
    } else {
      console.error(`Documents sync failed for Employee: ${zanId}`, response.statusText);
    }
  } catch (error) {
    console.error(`Error in background documents sync for employee ${zanId}:`, error);
  }
}

async function triggerBackgroundCertificatesSync(
  request: z.infer<typeof hrimsRequestSchema>,
  zanId: string
) {
  try {
    console.log(`Starting background certificates sync for Employee: ${zanId}`);
    
    const syncPayload = {
      zanId: zanId,
      institutionVoteNumber: request.institutionVoteNumber,
      hrimsApiUrl: request.hrimsApiUrl,
      hrimsApiKey: request.hrimsApiKey,
    };

    // Use the internal API base URL for background sync
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const response = await fetch(`${baseUrl}/api/hrims/sync-certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncPayload),
    });

    if (response.ok) {
      console.log(`Certificates sync completed for Employee: ${zanId}`);
    } else {
      console.error(`Certificates sync failed for Employee: ${zanId}`, response.statusText);
    }
  } catch (error) {
    console.error(`Error in background certificates sync for employee ${zanId}:`, error);
  }
}
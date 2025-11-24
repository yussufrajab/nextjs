import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for the HRIMS certificates sync request
const hrimsCertificatesRequestSchema = z.object({
  zanId: z.string().optional(),
  payrollNumber: z.string().optional(),
  institutionVoteNumber: z.string(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(20).optional().default(10),
  hrimsApiUrl: z.string().url().optional(),
  hrimsApiKey: z.string().optional(),
}).refine(
  (data) => data.zanId || data.payrollNumber,
  {
    message: "Either zanId or payrollNumber must be provided",
    path: ["zanId", "payrollNumber"],
  }
);

// Schema for expected HRIMS certificates response
const hrimsCertificatesResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    employeeId: z.string(),
    certificates: z.array(z.object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
      contentType: z.string(),
      content: z.string(), // Base64 encoded content
      size: z.number(),
      lastUpdated: z.string(),
      institutionAwarded: z.string().optional(),
      yearAwarded: z.string().optional(),
    })),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalItems: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('HRIMS certificates sync request received:', { ...body, hrimsApiKey: '[REDACTED]' });

    // Validate request payload
    const validatedRequest = hrimsCertificatesRequestSchema.parse(body);

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

    // Find employee to ensure they exist
    const employee = await db.employee.findFirst({
      where: {
        OR: [
          { zanId: validatedRequest.zanId },
          { payrollNumber: validatedRequest.payrollNumber }
        ],
        institutionId: institution.id
      }
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found in the specified institution'
      }, { status: 404 });
    }

    // Fetch employee certificates from HRIMS
    const hrimsData = await fetchCertificatesFromHRIMS(validatedRequest);
    
    if (!hrimsData) {
      return NextResponse.json({
        success: false,
        message: 'Certificates not found in HRIMS system'
      }, { status: 404 });
    }

    // Validate HRIMS response
    const validatedHrimsData = hrimsCertificatesResponseSchema.parse(hrimsData);

    // Store certificates in database
    const result = await storeEmployeeCertificates(validatedHrimsData, employee.id);

    console.log('Certificates synced successfully for employee:', employee.id);

    return NextResponse.json({
      success: true,
      message: 'Employee certificates synced successfully from HRIMS',
      data: {
        employeeId: employee.id,
        certificatesProcessed: validatedHrimsData.data.certificates.length,
        certificatesSuccessful: result.successful,
        certificatesFailed: result.failed,
        pagination: validatedHrimsData.data.pagination
      }
    }, { status: 200 });

  } catch (error) {
    console.error("[HRIMS_CERTIFICATES_SYNC_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error during HRIMS certificates sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to fetch employee certificates from external HRIMS system
async function fetchCertificatesFromHRIMS(request: z.infer<typeof hrimsCertificatesRequestSchema>) {
  try {
    const hrimsApiUrl = request.hrimsApiUrl || process.env.HRIMS_API_URL || 'https://hrims-api.example.com';
    const hrimsApiKey = request.hrimsApiKey || process.env.HRIMS_API_KEY;

    const searchParams = new URLSearchParams();
    if (request.zanId) searchParams.append('zanId', request.zanId);
    if (request.payrollNumber) searchParams.append('payrollNumber', request.payrollNumber);
    searchParams.append('institutionVoteNumber', request.institutionVoteNumber);
    searchParams.append('page', request.page.toString());
    searchParams.append('limit', request.limit.toString());

    const response = await fetch(`${hrimsApiUrl}/api/employee/certificates?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hrimsApiKey}`,
        'X-API-Key': hrimsApiKey || '',
      },
    });

    if (!response.ok) {
      console.error(`HRIMS Certificates API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('HRIMS Certificates API response received');
    return data;

  } catch (error) {
    console.error('Error fetching certificates from HRIMS:', error);
    
    // For development/demo - return mock data
    if (process.env.NODE_ENV === 'development' || process.env.HRIMS_MOCK_MODE === 'true') {
      console.log('Using mock HRIMS certificates data for development');
      return getMockHRIMSCertificatesData(request);
    }
    
    throw error;
  }
}

// Function to store employee certificates in the database
async function storeEmployeeCertificates(
  hrimsData: z.infer<typeof hrimsCertificatesResponseSchema>,
  employeeId: string
) {
  let successful = 0;
  let failed = 0;

  // Delete existing certificates for this employee on the first page
  if (hrimsData.data.pagination.currentPage === 1) {
    await db.employeeCertificate.deleteMany({
      where: { employeeId }
    });
  }

  for (const cert of hrimsData.data.certificates) {
    try {
      // Store certificate with base64 content as data URL
      await db.employeeCertificate.create({
        data: {
          employeeId,
          type: cert.type,
          name: cert.name,
          url: `data:${cert.contentType};base64,${cert.content}`,
          institutionAwarded: cert.institutionAwarded,
          yearAwarded: cert.yearAwarded,
        }
      });

      successful++;
    } catch (error) {
      console.error(`Failed to store certificate ${cert.id}:`, error);
      failed++;
    }
  }

  return { successful, failed };
}

// Mock data for development/testing
function getMockHRIMSCertificatesData(request: z.infer<typeof hrimsCertificatesRequestSchema>) {
  return {
    success: true,
    message: "Employee certificates retrieved successfully",
    data: {
      employeeId: request.zanId || request.payrollNumber || "Z123456789",
      certificates: [
        {
          id: "cert_001",
          type: "Bachelor Degree",
          name: "Bachelor of Science in Nursing",
          contentType: "application/pdf",
          content: "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggNDAKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgQmFjaGVsb3IgRGVncmVlIENlcnRpZmljYXRlKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoyOTgKJSVFT0Y=",
          size: 312567,
          lastUpdated: "2025-01-10",
          institutionAwarded: "University of Dodoma",
          yearAwarded: "2015"
        },
        {
          id: "cert_002",
          type: "Master Degree",
          name: "Master of Public Health",
          contentType: "application/pdf",
          content: "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggMzgKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgTWFzdGVyIERlZ3JlZSBDZXJ0aWZpY2F0ZSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjA4IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNQovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMjk2CiUlRU9G",
          size: 289134,
          lastUpdated: "2025-01-10",
          institutionAwarded: "Muhimbili University of Health Sciences",
          yearAwarded: "2019"
        },
        {
          id: "cert_003",
          type: "Certificate",
          name: "Public Administration Certificate",
          contentType: "application/pdf",
          content: "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggNDYKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgUHVibGljIEFkbWluaXN0cmF0aW9uIENlcnRpZmljYXRlKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozMDQKJSVFT0Y=",
          size: 198765,
          lastUpdated: "2025-01-08",
          institutionAwarded: "Institute of Public Administration",
          yearAwarded: "2012"
        }
      ],
      pagination: {
        currentPage: request.page,
        totalPages: 2,
        totalItems: 5,
        hasNext: request.page < 2,
        hasPrev: request.page > 1
      }
    }
  };
}
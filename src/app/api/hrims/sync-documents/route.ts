import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for the HRIMS documents sync request
const hrimsDocumentsRequestSchema = z.object({
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

// Schema for expected HRIMS documents response
const hrimsDocumentsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    employeeId: z.string(),
    documents: z.array(z.object({
      id: z.string(),
      type: z.enum(['ardhilHali', 'confirmationLetter', 'jobContract', 'birthCertificate']),
      name: z.string(),
      contentType: z.string(),
      content: z.string(), // Base64 encoded content
      size: z.number(),
      lastUpdated: z.string(),
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
    console.log('HRIMS documents sync request received:', { ...body, hrimsApiKey: '[REDACTED]' });

    // Validate request payload
    const validatedRequest = hrimsDocumentsRequestSchema.parse(body);

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

    // Fetch employee documents from HRIMS
    const hrimsData = await fetchDocumentsFromHRIMS(validatedRequest);
    
    if (!hrimsData) {
      return NextResponse.json({
        success: false,
        message: 'Documents not found in HRIMS system'
      }, { status: 404 });
    }

    // Validate HRIMS response
    const validatedHrimsData = hrimsDocumentsResponseSchema.parse(hrimsData);

    // Store documents in database
    const result = await storeEmployeeDocuments(validatedHrimsData, employee.id);

    console.log('Documents synced successfully for employee:', employee.id);

    return NextResponse.json({
      success: true,
      message: 'Employee documents synced successfully from HRIMS',
      data: {
        employeeId: employee.id,
        documentsProcessed: validatedHrimsData.data.documents.length,
        documentsSuccessful: result.successful,
        documentsFailed: result.failed,
        pagination: validatedHrimsData.data.pagination
      }
    }, { status: 200 });

  } catch (error) {
    console.error("[HRIMS_DOCUMENTS_SYNC_ERROR]", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error during HRIMS documents sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to fetch employee documents from external HRIMS system
async function fetchDocumentsFromHRIMS(request: z.infer<typeof hrimsDocumentsRequestSchema>) {
  try {
    const hrimsApiUrl = request.hrimsApiUrl || process.env.HRIMS_API_URL || 'https://hrims-api.example.com';
    const hrimsApiKey = request.hrimsApiKey || process.env.HRIMS_API_KEY;

    const searchParams = new URLSearchParams();
    if (request.zanId) searchParams.append('zanId', request.zanId);
    if (request.payrollNumber) searchParams.append('payrollNumber', request.payrollNumber);
    searchParams.append('institutionVoteNumber', request.institutionVoteNumber);
    searchParams.append('page', request.page.toString());
    searchParams.append('limit', request.limit.toString());

    const response = await fetch(`${hrimsApiUrl}/api/employee/documents?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hrimsApiKey}`,
        'X-API-Key': hrimsApiKey || '',
      },
    });

    if (!response.ok) {
      console.error(`HRIMS Documents API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('HRIMS Documents API response received');
    return data;

  } catch (error) {
    console.error('Error fetching documents from HRIMS:', error);
    
    // For development/demo - return mock data
    if (process.env.NODE_ENV === 'development' || process.env.HRIMS_MOCK_MODE === 'true') {
      console.log('Using mock HRIMS documents data for development');
      return getMockHRIMSDocumentsData(request);
    }
    
    throw error;
  }
}

// Function to store employee documents in the database
async function storeEmployeeDocuments(
  hrimsData: z.infer<typeof hrimsDocumentsResponseSchema>,
  employeeId: string
) {
  let successful = 0;
  let failed = 0;

  for (const doc of hrimsData.data.documents) {
    try {
      // Update employee with document URL based on type
      const updateData: any = {};
      
      switch (doc.type) {
        case 'ardhilHali':
          updateData.ardhilHaliUrl = `data:${doc.contentType};base64,${doc.content}`;
          break;
        case 'confirmationLetter':
          updateData.confirmationLetterUrl = `data:${doc.contentType};base64,${doc.content}`;
          break;
        case 'jobContract':
          updateData.jobContractUrl = `data:${doc.contentType};base64,${doc.content}`;
          break;
        case 'birthCertificate':
          updateData.birthCertificateUrl = `data:${doc.contentType};base64,${doc.content}`;
          break;
      }

      await db.employee.update({
        where: { id: employeeId },
        data: updateData
      });

      successful++;
    } catch (error) {
      console.error(`Failed to store document ${doc.id}:`, error);
      failed++;
    }
  }

  return { successful, failed };
}

// Mock data for development/testing
function getMockHRIMSDocumentsData(request: z.infer<typeof hrimsDocumentsRequestSchema>) {
  return {
    success: true,
    message: "Employee documents retrieved successfully",
    data: {
      employeeId: request.zanId || request.payrollNumber || "Z123456789",
      documents: [
        {
          id: "doc_001",
          type: "ardhilHali" as const,
          name: "Ardhil Hali Certificate",
          contentType: "application/pdf",
          content: "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgQXJkaGlsIEhhbGkgQ2VydGlmaWNhdGUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIwOCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMwMgolJUVPRg==",
          size: 245760,
          lastUpdated: "2025-01-15"
        },
        {
          id: "doc_002",
          type: "confirmationLetter" as const,
          name: "Employment Confirmation Letter",
          contentType: "application/pdf",
          content: "JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggNTIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgRW1wbG95bWVudCBDb25maXJtYXRpb24gTGV0dGVyKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozMTAKJSVFT0Y=",
          size: 189432,
          lastUpdated: "2025-02-20"
        }
      ],
      pagination: {
        currentPage: request.page,
        totalPages: 2,
        totalItems: 4,
        hasNext: request.page < 2,
        hasPrev: request.page > 1
      }
    }
  };
}
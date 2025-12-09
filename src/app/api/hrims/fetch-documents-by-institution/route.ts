import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '@/lib/minio';

const prisma = new PrismaClient();

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

interface DocumentResult {
  employeeId: string;
  employeeName: string;
  payrollNumber: string;
  documentsStored: {
    ardhilHali?: string;
    confirmationLetter?: string;
    jobContract?: string;
    birthCertificate?: string;
  };
  certificatesStored: Array<{
    type: string;
    fileUrl: string;
  }>;
  status: 'success' | 'partial' | 'failed';
  message?: string;
}

// Fetch document from HRIMS
async function fetchDocumentFromHRIMS(
  requestId: string,
  payrollNumber: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const payload = {
      RequestId: requestId,
      SearchCriteria: payrollNumber
    };

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const hrimsData = await response.json();

    // Extract document data - try different possible structures
    let documentData: string | null = null;

    if (hrimsData.data && typeof hrimsData.data === 'string') {
      documentData = hrimsData.data;
    } else if (hrimsData.data && hrimsData.data.Document) {
      documentData = hrimsData.data.Document;
    } else if (hrimsData.Document) {
      documentData = hrimsData.Document;
    } else if (hrimsData.data && hrimsData.data.FileContent) {
      documentData = hrimsData.data.FileContent;
    } else if (hrimsData.FileContent) {
      documentData = hrimsData.FileContent;
    }

    if (!documentData) {
      return { success: false, error: 'No document data in response' };
    }

    return { success: true, data: documentData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Store document in MinIO
async function storeDocumentInMinIO(
  employeeId: string,
  documentType: string,
  base64Data: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine file extension and content type
    // Most HRIMS documents are PDFs, but could be images
    const contentType = 'application/pdf';
    const extension = 'pdf';

    // Generate file path
    const fileName = `${employeeId}_${documentType}.${extension}`;
    const filePath = `employee-documents/${fileName}`;

    // Upload to MinIO
    await uploadFile(buffer, filePath, contentType);

    // Return MinIO URL
    const url = `/api/files/employee-documents/${fileName}`;
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

// Process documents for a single employee
async function processEmployeeDocuments(
  employee: {
    id: string;
    name: string;
    payrollNumber: string;
    ardhilHaliUrl: string | null;
    confirmationLetterUrl: string | null;
    jobContractUrl: string | null;
    birthCertificateUrl: string | null;
  }
): Promise<DocumentResult> {
  const result: DocumentResult = {
    employeeId: employee.id,
    employeeName: employee.name,
    payrollNumber: employee.payrollNumber,
    documentsStored: {},
    certificatesStored: [],
    status: 'failed',
  };

  let successCount = 0;
  let attemptCount = 0;

  // Document types to fetch (RequestId mapping)
  const documentTypes = [
    { name: 'ardhilHali', requestId: '204', field: 'ardhilHaliUrl', current: employee.ardhilHaliUrl },
    { name: 'confirmationLetter', requestId: '205', field: 'confirmationLetterUrl', current: employee.confirmationLetterUrl },
    { name: 'jobContract', requestId: '206', field: 'jobContractUrl', current: employee.jobContractUrl },
    { name: 'birthCertificate', requestId: '207', field: 'birthCertificateUrl', current: employee.birthCertificateUrl },
  ];

  const updateData: any = {};

  // Fetch each document type
  for (const docType of documentTypes) {
    // Skip if already exists in MinIO
    if (docType.current && docType.current.startsWith('/api/files/employee-documents/')) {
      continue;
    }

    attemptCount++;

    const fetchResult = await fetchDocumentFromHRIMS(docType.requestId, employee.payrollNumber);

    if (fetchResult.success && fetchResult.data) {
      const storeResult = await storeDocumentInMinIO(
        employee.id,
        docType.name,
        fetchResult.data
      );

      if (storeResult.success && storeResult.url) {
        result.documentsStored[docType.name as keyof typeof result.documentsStored] = storeResult.url;
        updateData[docType.field] = storeResult.url;
        successCount++;
      }
    }

    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Update employee record if we stored any documents
  if (Object.keys(updateData).length > 0) {
    try {
      await prisma.employee.update({
        where: { id: employee.id },
        data: updateData
      });
    } catch (error) {
      console.error(`Failed to update employee ${employee.id}:`, error);
    }
  }

  // Determine overall status
  if (successCount === 0) {
    result.status = 'failed';
    result.message = 'No documents found in HRIMS';
  } else if (successCount < attemptCount) {
    result.status = 'partial';
    result.message = `${successCount}/${attemptCount} documents stored`;
  } else {
    result.status = 'success';
    result.message = `All ${successCount} documents stored successfully`;
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { institutionId } = await request.json();

    if (!institutionId) {
      return NextResponse.json(
        { success: false, message: 'Institution ID is required' },
        { status: 400 }
      );
    }

    // Fetch employees from database for this institution
    const employees = await prisma.employee.findMany({
      where: {
        institutionId: institutionId,
      },
      select: {
        id: true,
        name: true,
        payrollNumber: true,
        ardhilHaliUrl: true,
        confirmationLetterUrl: true,
        jobContractUrl: true,
        birthCertificateUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No employees found for this institution',
        summary: {
          total: 0,
          successful: 0,
          partial: 0,
          failed: 0,
        },
        results: [],
      });
    }

    console.log(`Processing documents for ${employees.length} employees...`);

    const results: DocumentResult[] = [];
    let successfulCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    // Process each employee
    for (const employee of employees) {
      if (!employee.payrollNumber) {
        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          payrollNumber: 'N/A',
          documentsStored: {},
          certificatesStored: [],
          status: 'failed',
          message: 'No payroll number',
        });
        failedCount++;
        continue;
      }

      const result = await processEmployeeDocuments(employee);
      results.push(result);

      if (result.status === 'success') {
        successfulCount++;
      } else if (result.status === 'partial') {
        partialCount++;
      } else {
        failedCount++;
      }

      console.log(
        `Processed ${employee.name}: ${result.status} (${Object.keys(result.documentsStored).length} documents)`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${employees.length} employees`,
      summary: {
        total: employees.length,
        successful: successfulCount,
        partial: partialCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error in fetch-documents-by-institution:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process documents',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

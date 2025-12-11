import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';

// Utility function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Fetch documents from HRIMS using RequestId 206
async function fetchDocumentsFromHRIMS(
  payrollNumber: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = {
      RequestId: "206",
      SearchCriteria: payrollNumber
    };

    console.log(`Fetching documents for payroll number: ${payrollNumber}`);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000) // 60 second timeout for documents
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const hrimsData = await response.json();
    console.log(`HRIMS Response for ${payrollNumber}:`, JSON.stringify(hrimsData).substring(0, 200) + '...');

    // Return the full response data for processing
    return { success: true, data: hrimsData };
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

// Process documents for a single employee using RequestId 206
async function processEmployeeDocuments(
  employee: {
    id: string;
    name: string;
    payrollNumber: string | null;
    ardhilHaliUrl: string | null;
    confirmationLetterUrl: string | null;
    jobContractUrl: string | null;
    birthCertificateUrl: string | null;
  }
): Promise<DocumentResult> {
  const result: DocumentResult = {
    employeeId: employee.id,
    employeeName: employee.name,
    payrollNumber: employee.payrollNumber || 'N/A',
    documentsStored: {},
    certificatesStored: [],
    status: 'failed',
  };

  // Skip if no payroll number
  if (!employee.payrollNumber) {
    result.message = 'No payroll number available';
    return result;
  }

  // Fetch documents from HRIMS using RequestId 206
  const fetchResult = await fetchDocumentsFromHRIMS(employee.payrollNumber);

  if (!fetchResult.success || !fetchResult.data) {
    result.message = fetchResult.error || 'Failed to fetch documents from HRIMS';
    return result;
  }

  const hrimsData = fetchResult.data;
  const updateData: any = {};
  let documentsProcessed = 0;

  // Extract documents data from response - it's an array of attachment objects
  const attachments = Array.isArray(hrimsData.data) ? hrimsData.data : [];

  if (attachments.length === 0) {
    result.message = 'No documents found in HRIMS response';
    return result;
  }

  console.log(`Found ${attachments.length} attachments for ${employee.name}`);

  // Document type mapping: HRIMS attachmentType -> Database field
  const documentTypeMapping: Record<string, { field: string; dbKey: string; label: string }> = {
    'ardhilhali': { field: 'ardhilHaliUrl', dbKey: 'ardhilHali', label: 'Ardhil Hali' },
    'ardhilhaliurl': { field: 'ardhilHaliUrl', dbKey: 'ardhilHali', label: 'Ardhil Hali' },
    'comfirmationletter': { field: 'confirmationLetterUrl', dbKey: 'confirmationLetter', label: 'Confirmation Letter' },
    'confirmationletter': { field: 'confirmationLetterUrl', dbKey: 'confirmationLetter', label: 'Confirmation Letter' },
    'employmentcontract': { field: 'jobContractUrl', dbKey: 'jobContract', label: 'Job Contract' },
    'jobcontract': { field: 'jobContractUrl', dbKey: 'jobContract', label: 'Job Contract' },
    'birthcertificate': { field: 'birthCertificateUrl', dbKey: 'birthCertificate', label: 'Birth Certificate' },
  };

  // Process each attachment
  for (const attachment of attachments) {
    const attachmentType = attachment.attachmentType || '';
    const attachmentContent = attachment.attachmentContent || '';

    if (!attachmentContent) {
      continue;
    }

    // Normalize attachment type for matching
    const normalizedType = attachmentType.toLowerCase().replace(/[\s_-]/g, '');

    // Check if it's a core document type
    const docMapping = documentTypeMapping[normalizedType];

    if (docMapping) {
      // Check if already stored in MinIO
      const currentUrl = employee[docMapping.field as keyof typeof employee] as string | null;
      if (currentUrl && currentUrl.startsWith('/api/files/employee-documents/')) {
        result.documentsStored[docMapping.dbKey as keyof typeof result.documentsStored] = currentUrl;
        continue;
      }

      // Store document in MinIO
      const storeResult = await storeDocumentInMinIO(
        employee.id,
        docMapping.dbKey,
        attachmentContent
      );

      if (storeResult.success && storeResult.url) {
        result.documentsStored[docMapping.dbKey as keyof typeof result.documentsStored] = storeResult.url;
        updateData[docMapping.field] = storeResult.url;
        documentsProcessed++;
        console.log(`✓ Stored ${docMapping.label} for ${employee.name}`);
      } else {
        console.error(`✗ Failed to store ${docMapping.label}:`, storeResult.error);
      }
    } else if (attachmentType.toLowerCase().includes('educational') ||
               attachmentType.toLowerCase().includes('certification') ||
               attachmentType.toLowerCase().includes('certificate')) {
      // It's an educational certificate - check if already exists in database
      const certificateType = attachmentType;

      // Check if certificate already exists in database
      const existingCert = await prisma.employeeCertificate.findFirst({
        where: {
          employeeId: employee.id,
          type: certificateType,
        },
      });

      if (existingCert && existingCert.url && existingCert.url.startsWith('/api/files/')) {
        console.log(`⏭ Skipping certificate "${certificateType}" - already stored in MinIO for ${employee.name}`);
        result.certificatesStored.push({
          type: certificateType,
          fileUrl: existingCert.url,
        });
        continue;
      }

      // Store new certificate
      const storeResult = await storeDocumentInMinIO(
        employee.id,
        `certificate_${attachmentType.replace(/[\s_-]/g, '_')}`,
        attachmentContent
      );

      if (storeResult.success && storeResult.url) {
        result.certificatesStored.push({
          type: attachmentType,
          fileUrl: storeResult.url,
        });
        documentsProcessed++;
        console.log(`✓ Stored certificate: ${attachmentType} for ${employee.name}`);
      }
    }
  }

  // Update employee record if we stored any documents
  if (Object.keys(updateData).length > 0) {
    try {
      await prisma.employee.update({
        where: { id: employee.id },
        data: updateData
      });
      console.log(`✓ Updated database for ${employee.name}`);
    } catch (error) {
      console.error(`✗ Failed to update employee ${employee.id}:`, error);
    }
  }

  // Save certificates to database if any
  if (result.certificatesStored.length > 0) {
    try {
      for (const cert of result.certificatesStored) {
        // Check if certificate already exists
        const existing = await prisma.employeeCertificate.findFirst({
          where: {
            employeeId: employee.id,
            type: cert.type,
          },
        });

        if (existing) {
          // If URL matches, it was already stored - skip update
          if (existing.url === cert.fileUrl) {
            console.log(`ℹ️ Certificate "${cert.type}" already exists in database for ${employee.name}`);
          } else {
            // Update existing certificate with new URL
            await prisma.employeeCertificate.update({
              where: { id: existing.id },
              data: {
                url: cert.fileUrl,
                name: cert.type,
              },
            });
            console.log(`🔄 Updated certificate "${cert.type}" with new URL for ${employee.name}`);
          }
        } else {
          // Create new certificate
          await prisma.employeeCertificate.create({
            data: {
              id: `${employee.id}_${cert.type.replace(/\s+/g, '_')}`,
              employeeId: employee.id,
              type: cert.type,
              name: cert.type,
              url: cert.fileUrl,
            },
          });
          console.log(`➕ Created new certificate "${cert.type}" for ${employee.name}`);
        }
      }
      console.log(`✓ Processed ${result.certificatesStored.length} certificates for ${employee.name}`);
    } catch (error) {
      console.error(`✗ Failed to save certificates for ${employee.id}:`, error);
    }
  }

  // Determine overall status
  if (documentsProcessed === 0) {
    result.status = 'failed';
    result.message = 'No documents found in HRIMS response';
  } else {
    result.status = 'success';
    result.message = `Successfully stored ${documentsProcessed} document(s)`;
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
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];

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

      // Add delay between HRIMS requests to prevent server overload
      // Skip delay after the last employee
      if (i < employees.length - 1) {
        await delay(1500); // 1.5 second delay between requests
        console.log(`Waiting 1.5s before next request...`);
      }
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

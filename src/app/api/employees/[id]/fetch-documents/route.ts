import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

// Valid educational certificate types (excluding primary education)
const VALID_CERTIFICATE_TYPES = [
  'Certificate of Secondary education (Form IV)',
  'Advanced Certificate of Secondary education (Form VII)',
  'Certificate',
  'Diploma',
  'Advanced Diploma',
  'Bachelor Degree',
  'Master Degree',
  'PHd'
] as const;

/**
 * Maps HRIMS certificate names to our standardized certificate types
 * Returns the mapped certificate type or null if no match found
 */
function mapCertificateType(hrimsAttachmentType: string): string | null {
  const normalized = hrimsAttachmentType.toLowerCase().trim();

  // Form IV / O-Level / Secondary Education
  if (
    normalized.includes('form iv') ||
    normalized.includes('form 4') ||
    normalized.includes('o-level') ||
    normalized.includes('o level') ||
    normalized.includes('csee') ||
    (normalized.includes('secondary') && (normalized.includes('certificate') || normalized.includes('education')) && !normalized.includes('advanced'))
  ) {
    return 'Certificate of Secondary education (Form IV)';
  }

  // Form VI / A-Level / Advanced Secondary Education
  if (
    normalized.includes('form vi') ||
    normalized.includes('form 6') ||
    normalized.includes('a-level') ||
    normalized.includes('a level') ||
    normalized.includes('acsee') ||
    (normalized.includes('advanced') && normalized.includes('secondary'))
  ) {
    return 'Advanced Certificate of Secondary education (Form VII)';
  }

  // PhD / Doctorate
  if (
    normalized.includes('phd') ||
    normalized.includes('ph.d') ||
    normalized.includes('doctorate') ||
    normalized.includes('doctoral')
  ) {
    return 'PHd';
  }

  // Master's Degree
  if (
    normalized.includes('master') ||
    normalized.includes('msc') ||
    normalized.includes('ma ') ||
    normalized.includes('mba') ||
    normalized.includes('med') ||
    normalized.includes('m.sc') ||
    normalized.includes('m.a')
  ) {
    return 'Master Degree';
  }

  // Bachelor's Degree
  if (
    normalized.includes('bachelor') ||
    normalized.includes('bsc') ||
    normalized.includes('ba ') ||
    normalized.includes('bed') ||
    normalized.includes('beng') ||
    normalized.includes('b.sc') ||
    normalized.includes('b.a') ||
    normalized.includes('degree') && !normalized.includes('master') && !normalized.includes('advanced')
  ) {
    return 'Bachelor Degree';
  }

  // Advanced Diploma
  if (
    normalized.includes('advanced diploma') ||
    normalized.includes('higher diploma') ||
    normalized.includes('postgraduate diploma')
  ) {
    return 'Advanced Diploma';
  }

  // Diploma
  if (
    normalized.includes('diploma') &&
    !normalized.includes('advanced') &&
    !normalized.includes('higher') &&
    !normalized.includes('postgraduate')
  ) {
    return 'Diploma';
  }

  // Certificate (general, not secondary education)
  if (
    (normalized.includes('certificate') &&
     !normalized.includes('secondary') &&
     !normalized.includes('form')) ||
    normalized.includes('cert.')
  ) {
    return 'Certificate';
  }

  // No match found
  return null;
}

// Store document in MinIO
async function storeDocumentInMinIO(
  employeeId: string,
  documentType: string,
  base64Data: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Remove data URI prefix if present
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:[^;]+;base64,(.+)$/);
      if (matches) {
        cleanBase64 = matches[1];
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Generate file path
    const fileName = `${employeeId}_${documentType}.pdf`;
    const filePath = `employee-documents/${fileName}`;

    // Upload to MinIO
    await uploadFile(buffer, filePath, 'application/pdf');

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Fetch employee from database to get payroll number
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        payrollNumber: true,
        name: true,
        ardhilHaliUrl: true,
        confirmationLetterUrl: true,
        jobContractUrl: true,
        birthCertificateUrl: true,
      }
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      );
    }

    if (!employee.payrollNumber) {
      return NextResponse.json(
        { success: false, message: 'Employee does not have a payroll number' },
        { status: 400 }
      );
    }

    console.log(`📄 Fetching documents for employee ${employee.name} (Payroll: ${employee.payrollNumber})`);

    // Fetch documents from HRIMS using RequestId 206
    const documentsPayload = {
      RequestId: "206",
      SearchCriteria: employee.payrollNumber
    };

    const hrimsResponse = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentsPayload),
      signal: AbortSignal.timeout(60000) // 60 second timeout for documents
    });

    if (!hrimsResponse.ok) {
      console.error(`❌ HRIMS API error: ${hrimsResponse.status} ${hrimsResponse.statusText}`);
      return NextResponse.json(
        {
          success: false,
          message: `HRIMS API returned error: ${hrimsResponse.status}`,
          error: hrimsResponse.statusText
        },
        { status: 502 }
      );
    }

    const hrimsData = await hrimsResponse.json();
    console.log('✅ Received response from HRIMS');
    console.log('HRIMS Response structure:', JSON.stringify(hrimsData).substring(0, 500) + '...');

    // Extract documents data from response - it's an array of attachment objects
    const attachments = Array.isArray(hrimsData.data) ? hrimsData.data : [];

    if (attachments.length === 0) {
      console.log('⚠️ No attachments found in HRIMS response');
      return NextResponse.json({
        success: false,
        message: 'No documents found in HRIMS response',
        hrimsResponse: hrimsData
      }, { status: 404 });
    }

    console.log(`📦 Found ${attachments.length} attachments`);

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

    const updateData: any = {};
    const documentsStored: any = {};
    const certificatesStored: Array<{ type: string; fileUrl: string }> = [];
    let documentsProcessed = 0;

    // Process each attachment
    for (const attachment of attachments) {
      const attachmentType = attachment.attachmentType || '';
      const attachmentContent = attachment.attachmentContent || '';

      if (!attachmentContent) {
        console.log(`⚠️ Skipping ${attachmentType} - no content`);
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
          console.log(`⏭️ Skipping ${docMapping.label} - already stored in MinIO`);
          documentsStored[docMapping.dbKey] = currentUrl;
          continue;
        }

        // Store document in MinIO
        const storeResult = await storeDocumentInMinIO(
          employee.id,
          docMapping.dbKey,
          attachmentContent
        );

        if (storeResult.success && storeResult.url) {
          documentsStored[docMapping.dbKey] = storeResult.url;
          updateData[docMapping.field] = storeResult.url;
          documentsProcessed++;
          console.log(`✅ Stored ${docMapping.label} (${attachment.contentSize} bytes)`);
        } else {
          console.error(`❌ Failed to store ${docMapping.label}:`, storeResult.error);
        }
      } else if (attachmentType.toLowerCase().includes('educational') ||
                 attachmentType.toLowerCase().includes('certification') ||
                 attachmentType.toLowerCase().includes('certificate')) {
        // It's an educational certificate - check if already exists in database
        const certificateType = attachmentType; // Use original HRIMS certificate name

        // Check if certificate already exists in database
        const existingCert = await prisma.employeeCertificate.findFirst({
          where: {
            employeeId: employee.id,
            type: certificateType,
          },
        });

        if (existingCert && existingCert.url && existingCert.url.startsWith('/api/files/')) {
          console.log(`⏭️ Skipping certificate "${certificateType}" - already stored in MinIO`);
          certificatesStored.push({
            type: certificateType,
            fileUrl: existingCert.url,
          });
          continue;
        }

        // Check if we've already processed a certificate with this exact name in this batch
        const duplicateCount = certificatesStored.filter(c => c.type.startsWith(certificateType)).length;

        // Add numeric suffix if there are duplicates in this batch
        let finalCertificateType = certificateType;
        if (duplicateCount > 0) {
          finalCertificateType = `${certificateType} ${duplicateCount + 1}`;
          console.log(`📜 Found duplicate certificate name in batch, adding suffix: "${finalCertificateType}"`);
        } else {
          console.log(`📜 Saving certificate with original HRIMS name: "${finalCertificateType}"`);
        }

        const storeResult = await storeDocumentInMinIO(
          employee.id,
          `certificate_${finalCertificateType.replace(/[\s_-]/g, '_')}`,
          attachmentContent
        );

        if (storeResult.success && storeResult.url) {
          certificatesStored.push({
            type: finalCertificateType, // Use original HRIMS name with suffix if duplicate
            fileUrl: storeResult.url,
          });
          documentsProcessed++;
          console.log(`✅ Stored certificate: ${finalCertificateType} (${attachment.contentSize} bytes)`);
        }
      } else {
        // Other document type - store but log it
        console.log(`📄 Found other document type: ${attachmentType} (${attachment.contentSize} bytes)`);

        const storeResult = await storeDocumentInMinIO(
          employee.id,
          `other_${attachmentType.replace(/[\s_-]/g, '_')}`,
          attachmentContent
        );

        if (storeResult.success) {
          documentsProcessed++;
          console.log(`✅ Stored other document: ${attachmentType}`);
        }
      }
    }

    // Update employee record if we stored any documents
    if (Object.keys(updateData).length > 0) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: updateData
      });
      console.log(`✅ Updated database for ${employee.name}`);
    }

    // Save certificates to database if any and collect the saved certificate records
    const savedCertificates: Array<{ id: string; type: string; name: string; url: string }> = [];

    if (certificatesStored.length > 0) {
      for (const cert of certificatesStored) {
        // Check if certificate already exists
        const existing = await prisma.employeeCertificate.findFirst({
          where: {
            employeeId: employee.id,
            type: cert.type,
          },
        });

        let savedCert;
        if (existing) {
          // If URL matches, it was already stored - just use existing record
          if (existing.url === cert.fileUrl) {
            savedCert = existing;
            console.log(`ℹ️ Certificate "${cert.type}" already exists in database`);
          } else {
            // Update existing certificate with new URL
            savedCert = await prisma.employeeCertificate.update({
              where: { id: existing.id },
              data: {
                url: cert.fileUrl,
                name: cert.type,
              },
            });
            console.log(`🔄 Updated certificate "${cert.type}" with new URL`);
          }
        } else {
          // Create new certificate
          savedCert = await prisma.employeeCertificate.create({
            data: {
              id: `${employee.id}_${cert.type.replace(/\s+/g, '_')}`,
              employeeId: employee.id,
              type: cert.type,
              name: cert.type,
              url: cert.fileUrl,
            },
          });
          console.log(`➕ Created new certificate "${cert.type}"`);
        }

        // Add to savedCertificates array with proper format for frontend
        savedCertificates.push({
          id: savedCert.id,
          type: savedCert.type,
          name: savedCert.name,
          url: savedCert.url
        });
      }
      console.log(`✅ Processed ${certificatesStored.length} certificates for ${employee.name}`);
    }

    if (documentsProcessed === 0) {
      console.log('⚠️ No documents found in HRIMS response');
      return NextResponse.json({
        success: false,
        message: 'No documents found in HRIMS response',
        hrimsResponse: hrimsData
      }, { status: 404 });
    }

    console.log(`✅ Successfully processed ${documentsProcessed} document(s) for ${employee.name}`);

    return NextResponse.json({
      success: true,
      message: `Successfully fetched and stored ${documentsProcessed} document(s)`,
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        documentsStored,
        certificatesStored: savedCertificates, // Return properly formatted certificates with IDs
        totalProcessed: documentsProcessed
      }
    });

  } catch (error) {
    console.error('🚨 Error fetching documents from HRIMS:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch documents from HRIMS',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

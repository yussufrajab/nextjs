import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { uploadFile } from '@/lib/minio';
import { validateFileUpload } from '@/lib/file-validation';
import { getHrimsApiConfig } from '@/lib/hrims-config';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';
import {
  classifyAttachments,
  HRIMS_EMPTY_CONTENT_ERROR_CODE,
  HRIMS_EMPTY_CONTENT_MESSAGE,
} from '@/lib/hrims-documents';

// Valid educational certificate types (excluding primary education)
const VALID_CERTIFICATE_TYPES = [
 'Certificate of Secondary education (Form IV)',
 'Advanced Certificate of Secondary education (Form VII)',
 'Certificate',
 'Diploma',
 'Advanced Diploma',
 'Bachelor Degree',
 'Master Degree',
 'PHd',
] as const;

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
 {
 code: '23',
 name: 'Confirmation Letter',
 dbField: 'confirmationLetterUrl',
 dbKey: 'confirmationLetter',
 },
 { code: '8', name: 'Educational Certificate', dbField: null, dbKey: null }, // Stored as certificate, not core document
] as const;

// Helper function for delays between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
 (normalized.includes('secondary') &&
 (normalized.includes('certificate') ||
 normalized.includes('education')) &&
 !normalized.includes('advanced'))
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
 (normalized.includes('degree') &&
 !normalized.includes('master') &&
 !normalized.includes('advanced'))
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
 let mimeType = 'application/pdf'; // default for documents
 if (base64Data.startsWith('data:')) {
 const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
 if (matches) {
 mimeType = matches[1];
 cleanBase64 = matches[2];
 }
 }

 // Convert base64 to buffer
 const buffer = Buffer.from(cleanBase64, 'base64');

 // Validate file before uploading
 const validation = await validateFileUpload(buffer, `${documentType}.pdf`, mimeType, 'documents');
 if (!validation.success) {
 return {
 success: false,
 error: `Document validation failed: ${validation.error}`,
 };
 }

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
 error: error instanceof Error ? error.message : 'Upload failed',
 };
 }
}

export const POST = wrapHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const rateLimitResult = await checkRateLimit(`ratelimit:${getClientIp(request)}:write`, 'write');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

 const { id: employeeId } = await params;

 // SECURITY: Institution ownership check
 const roleUpper = auth.role.toUpperCase();
 if (['ADMIN', 'HRMO', 'HHRMD', 'CSCS', 'DO', 'PO'].includes(roleUpper)) {
   // Central/commission roles — unrestricted access
 } else if (roleUpper === 'HRO' || roleUpper === 'HRRP') {
   const empCheck = await prisma.employee.findUnique({
     where: { id: employeeId },
     select: { institutionId: true },
   });
   if (!empCheck || empCheck.institutionId !== auth.institutionId) {
     return NextResponse.json(
       { success: false, message: 'Access denied' },
       { status: 403 }
     );
   }
 } else if (roleUpper === 'EMPLOYEE') {
   const user = await prisma.user.findUnique({
     where: { id: auth.userId },
     select: { employeeId: true },
   });
   if (!user?.employeeId || user.employeeId !== employeeId) {
     return NextResponse.json(
       { success: false, message: 'Access denied' },
       { status: 403 }
     );
   }
 } else {
   return NextResponse.json(
     { success: false, message: 'Access denied' },
     { status: 403 }
   );
 }

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
 dataSource: true,
 },
 });

 if (!employee) {
 return NextResponse.json(
 { success: false, message: 'Employee not found' },
 { status: 404 }
 );
 }

 // Don't fetch from HRIMS for manually entered employees
 if (employee.dataSource === 'MANUAL_ENTRY') {
 return NextResponse.json(
 {
 success: false,
 message: 'Cannot fetch documents from HRIMS for manually entered employees',
 },
 { status: 400 }
 );
 }

 if (!employee.payrollNumber) {
 return NextResponse.json(
 { success: false, message: 'Employee does not have a payroll number' },
 { status: 400 }
 );
 }

 logger.info(
 ` Fetching documents for employee ${employee.name} (Payroll: ${employee.payrollNumber})`
 );
 logger.info(
 ` Making ${DOCUMENT_TYPES.length} separate HRIMS API calls (one per document type)`
 );

 const allAttachments: any[] = [];

 // Make separate API call for each document type
 for (let i = 0; i < DOCUMENT_TYPES.length; i++) {
 const docType = DOCUMENT_TYPES[i];

 // Skip if document already exists in MinIO
 const currentUrl = employee[docType.dbField as keyof typeof employee] as
 | string
 | null;
 if (
 currentUrl &&
 currentUrl.startsWith('/api/files/employee-documents/')
 ) {
 logger.info(`⏭ Skipping ${docType.name} - already stored in MinIO`);
 continue;
 }

 logger.info(
 `\n Fetching document type: ${docType.name} (RequestBody: ${docType.code})...`
 );

 const documentsPayload = {
 RequestId: '206',
 SearchCriteria: employee.payrollNumber,
 RequestPayloadData: {
 RequestBody: docType.code,
 },
 };

 try {
 const hrimsConfig = await getHrimsApiConfig();
 const hrimsResponse = await fetch(
 `${hrimsConfig.BASE_URL}/Employees`,
 {
 method: 'POST',
 headers: {
 ApiKey: hrimsConfig.API_KEY,
 Token: hrimsConfig.TOKEN,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify(documentsPayload),
 signal: AbortSignal.timeout(120000), // 120 second timeout
 }
 );

 if (!hrimsResponse.ok) {
 logger.error(
 ` HRIMS API error for ${docType.name}: ${hrimsResponse.status} ${hrimsResponse.statusText}`
 );
 continue; // Skip to next document type
 }

 const hrimsData = await hrimsResponse.json();

 // Check for HRIMS internal errors
 if (hrimsData.code === 500 || hrimsData.status === 'Failure') {
 logger.error(`HRIMS internal error for ${docType.name}: ${hrimsData.message}`);
 continue; // Skip to next document type
 }

 logger.info(` Received response from HRIMS for ${docType.name}`);

 // Extract attachments and add to allAttachments array
 const attachments = Array.isArray(hrimsData.data) ? hrimsData.data : [];
 if (attachments.length > 0) {
 logger.info(
 ` Found ${attachments.length} attachment(s) for ${docType.name}`
 );
 allAttachments.push(...attachments);
 } else {
 logger.info(` No attachments found for ${docType.name}`);
 }

 // Add delay between requests (except after last request)
 if (i < DOCUMENT_TYPES.length - 1) {
 logger.info(' Waiting 2 seconds before next request...');
 await delay(2000);
 }
 } catch (error) {
 logger.error(`Error fetching ${docType.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
 continue; // Skip to next document type
 }
 }

 if (allAttachments.length === 0) {
 logger.info(' No documents found across all HRIMS requests');
 return NextResponse.json(
 {
 success: false,
 message: 'No documents found in HRIMS',
 },
 { status: 404 }
 );
 }

 logger.info(` Total attachments collected: ${allAttachments.length}`);

 // Classify attachments into storable (with base64 content) vs upstream
 // empty-content (metadata only). HRIMS can return contentSize > 0 with an
 // empty attachmentContent — that is an HRIMS-side content-delivery issue,
 // not a missing document, and must be reported distinctly.
 const classification = classifyAttachments(allAttachments);
 const emptyContentCount = classification.emptyContent.length;
 if (emptyContentCount > 0) {
 logger.warn(
 `${emptyContentCount}/${allAttachments.length} attachment(s) arrived with empty content (HRIMS content-delivery issue)`
 );
 }

 // Document type mapping: HRIMS attachmentType -> Database field
 const documentTypeMapping: Record<
 string,
 { field: string; dbKey: string; label: string }
 > = {
 ardhilhali: {
 field: 'ardhilHaliUrl',
 dbKey: 'ardhilHali',
 label: 'Ardhil Hali',
 },
 ardhilhaliurl: {
 field: 'ardhilHaliUrl',
 dbKey: 'ardhilHali',
 label: 'Ardhil Hali',
 },
 comfirmationletter: {
 field: 'confirmationLetterUrl',
 dbKey: 'confirmationLetter',
 label: 'Confirmation Letter',
 },
 confirmationletter: {
 field: 'confirmationLetterUrl',
 dbKey: 'confirmationLetter',
 label: 'Confirmation Letter',
 },
 employmentcontract: {
 field: 'jobContractUrl',
 dbKey: 'jobContract',
 label: 'Job Contract',
 },
 jobcontract: {
 field: 'jobContractUrl',
 dbKey: 'jobContract',
 label: 'Job Contract',
 },
 birthcertificate: {
 field: 'birthCertificateUrl',
 dbKey: 'birthCertificate',
 label: 'Birth Certificate',
 },
 };

 const updateData: any = {};
 const documentsStored: any = {};
 const certificatesStored: Array<{ type: string; fileUrl: string }> = [];
 let documentsProcessed = 0;

 // Process each attachment
 for (const attachment of allAttachments) {
 const attachmentType = attachment.attachmentType || '';
 const attachmentContent = attachment.attachmentContent || '';

 if (!attachmentContent) {
 logger.info(` Skipping ${attachmentType} - no content`);
 continue;
 }

 // Normalize attachment type for matching
 const normalizedType = attachmentType
 .toLowerCase()
 .replace(/[\s_-]/g, '');

 // Check if it's a core document type
 const docMapping = documentTypeMapping[normalizedType];

 if (docMapping) {
 // Check if already stored in MinIO
 const currentUrl = employee[
 docMapping.field as keyof typeof employee
 ] as string | null;
 if (
 currentUrl &&
 currentUrl.startsWith('/api/files/employee-documents/')
 ) {
 logger.info(
 `⏭ Skipping ${docMapping.label} - already stored in MinIO`
 );
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
 logger.info(
 ` Stored ${docMapping.label} (${attachment.contentSize} bytes)`
 );
 } else {
 logger.error(`Failed to store ${docMapping.label}: ${storeResult.error}`);
 }
 } else if (
 attachmentType.toLowerCase().includes('educational') ||
 attachmentType.toLowerCase().includes('certification') ||
 attachmentType.toLowerCase().includes('certificate')
 ) {
 // It's an educational certificate - check if already exists in database
 const certificateType = attachmentType; // Use original HRIMS certificate name

 // Check if certificate already exists in database
 const existingCert = await prisma.employeeCertificate.findFirst({
 where: {
 employeeId: employee.id,
 type: certificateType,
 },
 });

 if (
 existingCert &&
 existingCert.url &&
 existingCert.url.startsWith('/api/files/')
 ) {
 logger.info(
 `⏭ Skipping certificate "${certificateType}" - already stored in MinIO`
 );
 certificatesStored.push({
 type: certificateType,
 fileUrl: existingCert.url,
 });
 continue;
 }

 // Check if we've already processed a certificate with this exact name in this batch
 const duplicateCount = certificatesStored.filter((c) =>
 c.type.startsWith(certificateType)
 ).length;

 // Add numeric suffix if there are duplicates in this batch
 let finalCertificateType = certificateType;
 if (duplicateCount > 0) {
 finalCertificateType = `${certificateType} ${duplicateCount + 1}`;
 logger.info(
 `📜 Found duplicate certificate name in batch, adding suffix: "${finalCertificateType}"`
 );
 } else {
 logger.info(
 `📜 Saving certificate with original HRIMS name: "${finalCertificateType}"`
 );
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
 logger.info(
 ` Stored certificate: ${finalCertificateType} (${attachment.contentSize} bytes)`
 );
 }
 } else {
 // Other document type - store but log it
 logger.info(
 ` Found other document type: ${attachmentType} (${attachment.contentSize} bytes)`
 );

 const storeResult = await storeDocumentInMinIO(
 employee.id,
 `other_${attachmentType.replace(/[\s_-]/g, '_')}`,
 attachmentContent
 );

 if (storeResult.success) {
 documentsProcessed++;
 logger.info(` Stored other document: ${attachmentType}`);
 }
 }
 }

 // Update employee record if we stored any documents
 if (Object.keys(updateData).length > 0) {
 await prisma.employee.update({
 where: { id: employee.id },
 data: updateData,
 });
 logger.info(` Updated database for ${employee.name}`);
 }

 // Save certificates to database if any and collect the saved certificate records
 const savedCertificates: Array<{
 id: string;
 type: string;
 name: string;
 url: string;
 }> = [];

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
 logger.info(
 `ℹ Certificate "${cert.type}" already exists in database`
 );
 } else {
 // Update existing certificate with new URL
 savedCert = await prisma.employeeCertificate.update({
 where: { id: existing.id },
 data: {
 url: cert.fileUrl,
 name: cert.type,
 },
 });
 logger.info(` Updated certificate "${cert.type}" with new URL`);
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
 logger.info(` Created new certificate "${cert.type}"`);
 }

 // Add to savedCertificates array with proper format for frontend
 savedCertificates.push({
 id: savedCert.id,
 type: savedCert.type,
 name: savedCert.name,
 url: savedCert.url ?? '',
 });
 }
 logger.info(
 ` Processed ${certificatesStored.length} certificates for ${employee.name}`
 );
 }

 if (documentsProcessed === 0) {
 // If HRIMS sent metadata with empty content, surface the upstream issue
 // (502 Bad Gateway) instead of the misleading 404 "No documents found".
 if (emptyContentCount > 0) {
 logger.warn(
 'HRIMS returned document metadata with empty content — upstream content-delivery issue'
 );
 return NextResponse.json(
 {
 success: false,
 errorCode: HRIMS_EMPTY_CONTENT_ERROR_CODE,
 message: HRIMS_EMPTY_CONTENT_MESSAGE,
 },
 { status: 502 }
 );
 }
 logger.info(' No documents found in HRIMS response');
 return NextResponse.json(
 {
 success: false,
 message: 'No documents found in HRIMS response',
 },
 { status: 404 }
 );
 }

 logger.info(
 ` Successfully processed ${documentsProcessed} document(s) for ${employee.name}`
 );

 return NextResponse.json({
 success: true,
 message: `Successfully fetched and stored ${documentsProcessed} document(s)`,
 data: {
 employeeId: employee.id,
 employeeName: employee.name,
 documentsStored,
 certificatesStored: savedCertificates, // Return properly formatted certificates with IDs
 totalProcessed: documentsProcessed,
 },
 });
}, 'employees-fetch-documents');

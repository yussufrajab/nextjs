import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { hrimsLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { scanFile, isClamAVEnabled } from '@/lib/clamav';
import { recordDocumentHash, verifyDocumentHash } from '@/lib/file-integrity';
import { logHrimsSync, getClientIp } from '@/lib/audit-logger';
import {
  getHrimsApiConfig,
  isHrimsConfigError,
} from '@/lib/hrims-config';

// SECURITY (Req 11.2): the HRIMS endpoint and credentials are sourced ONLY
// from server config (`getHrimsApiConfig`) — never from the request body —
// so an authorized caller cannot point the server at an arbitrary host
// (SSRF) or exfiltrate the API key. `hrimsApiUrl`/`hrimsApiKey` are
// deliberately absent from this schema.
const hrimsDocumentsRequestSchema = z
  .object({
    zanId: z.string().optional(),
    payrollNumber: z.string().optional(),
    institutionVoteNumber: z.string(),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(20).optional().default(10),
  })
  .refine((data) => data.zanId || data.payrollNumber, {
    message: 'Either zanId or payrollNumber must be provided',
    path: ['zanId', 'payrollNumber'],
  });

// Schema for expected HRIMS documents response
const hrimsDocumentsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    employeeId: z.string(),
    documents: z.array(
      z.object({
        id: z.string(),
        type: z.enum([
          'ardhilHali',
          'confirmationLetter',
          'jobContract',
          'birthCertificate',
        ]),
        name: z.string(),
        contentType: z.string(),
        content: z.string(), // Base64 encoded content
        size: z.number(),
        lastUpdated: z.string(),
      })
    ),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalItems: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
});

export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
    // Step-up re-authentication: triggering an HRIMS documents sync is a
    // Tier-1 sensitive action (writes employee document data into CSMS).
    // Mirrors sync-employee/bulk-fetch (Req 11.1).
    const denied = requireReauth(req, 'hrims.sync', auth);
    if (denied) return denied;

    const body = await req.json();
    hrimsLogger.info({ ...body }, 'HRIMS documents sync request received');

    const auditCommon = {
      performedById: auth.userId,
      performedByUsername: auth.username,
      performedByRole: auth.role,
      route: '/api/hrims/sync-documents',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    };

    // Validate request payload
    const validatedRequest = hrimsDocumentsRequestSchema.parse(body);

    // Find institution by vote number
    const institution = await db.institution.findFirst({
      where: {
        voteNumber: validatedRequest.institutionVoteNumber,
      },
    });

    if (!institution) {
      await logHrimsSync({
        ...auditCommon,
        success: false,
        institutionVoteNumber: validatedRequest.institutionVoteNumber,
        additionalData: { reason: 'institution_not_found' },
      }).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          message: `Institution with vote number ${validatedRequest.institutionVoteNumber} not found`,
        },
        { status: 404 }
      );
    }

    // Find employee to ensure they exist
    const employee = await db.employee.findFirst({
      where: {
        OR: [
          { zanId: validatedRequest.zanId },
          { payrollNumber: validatedRequest.payrollNumber },
        ],
        institutionId: institution.id,
      },
    });

    if (!employee) {
      await logHrimsSync({
        ...auditCommon,
        success: false,
        institutionId: institution.id,
        institutionVoteNumber: validatedRequest.institutionVoteNumber,
        zanId: validatedRequest.zanId,
        additionalData: { reason: 'employee_not_found_in_institution' },
      }).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          message: 'Employee not found in the specified institution',
        },
        { status: 404 }
      );
    }

    // SECURITY (Req 11.2): resolve the trusted HRIMS endpoint + credentials
    // from server config. A non-allowlisted host or non-https-in-production
    // config throws `HrimsConfigError` → 400 + `HRIMS_SYNC_FAILED` audit, so
    // the server is never proxied at a caller-chosen host.
    let HRIMS_CONFIG;
    try {
      HRIMS_CONFIG = await getHrimsApiConfig();
    } catch (configError) {
      if (isHrimsConfigError(configError)) {
        await logHrimsSync({
          ...auditCommon,
          success: false,
          institutionVoteNumber: validatedRequest.institutionVoteNumber,
          zanId: validatedRequest.zanId,
          additionalData: { reason: configError.code },
        }).catch(() => {});
        return NextResponse.json(
          {
            success: false,
            message: configError.message,
            errorCode: configError.code,
          },
          { status: 400 }
        );
      }
      throw configError;
    }

    // Fetch employee documents from HRIMS
    const hrimsData = await fetchDocumentsFromHRIMS(validatedRequest, HRIMS_CONFIG);

    if (!hrimsData) {
      await logHrimsSync({
        ...auditCommon,
        success: false,
        institutionId: institution.id,
        institutionVoteNumber: validatedRequest.institutionVoteNumber,
        zanId: validatedRequest.zanId,
        additionalData: { reason: 'documents_not_found_in_hrims' },
      }).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          message: 'Documents not found in HRIMS system',
        },
        { status: 404 }
      );
    }

    // Validate HRIMS response
    const validatedHrimsData = hrimsDocumentsResponseSchema.parse(hrimsData);

    // Store documents in database
    const result = await storeEmployeeDocuments(
      validatedHrimsData,
      employee.id
    );

    hrimsLogger.info({ employeeId: employee.id }, 'Documents synced successfully for Employee');

    // Q8: record the documents sync in the tamper-evident audit trail.
    await logHrimsSync({
      ...auditCommon,
      success: true,
      institutionId: institution.id,
      institutionVoteNumber: validatedRequest.institutionVoteNumber,
      zanId: validatedRequest.zanId,
      additionalData: {
        employeeId: employee.id,
        documentsProcessed: validatedHrimsData.data.documents.length,
        documentsSuccessful: result.successful,
        documentsFailed: result.failed,
        rejectedForMalware: result.rejectedForMalware.length,
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: 'Employee documents synced successfully from HRIMS',
        data: {
          employeeId: employee.id,
          documentsProcessed: validatedHrimsData.data.documents.length,
          documentsSuccessful: result.successful,
          documentsFailed: result.failed,
          pagination: validatedHrimsData.data.pagination,
        },
      },
      { status: 200 }
    );
  }, { allowedRoles: ['Admin', 'HHRMD', 'CSCS'] }), 'hrims-documents');

// Function to fetch employee documents from external HRIMS system
async function fetchDocumentsFromHRIMS(
  request: z.infer<typeof hrimsDocumentsRequestSchema>,
  hrimsConfig: { BASE_URL: string; API_KEY: string; TOKEN: string }
) {
  try {
    // SECURITY (Req 11.2): endpoint + credentials come from the trusted
    // server config (`hrimsConfig`), never from the request body. TLS cert
    // validation is left at undici's secure default (never disabled).
    const searchParams = new URLSearchParams();
    if (request.zanId) searchParams.append('zanId', request.zanId);
    if (request.payrollNumber)
      searchParams.append('payrollNumber', request.payrollNumber);
    searchParams.append('institutionVoteNumber', request.institutionVoteNumber);
    searchParams.append('page', request.page.toString());
    searchParams.append('limit', request.limit.toString());

    const response = await fetch(
      `${hrimsConfig.BASE_URL}/employee/documents?${searchParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hrimsConfig.API_KEY}`,
          'X-API-Key': hrimsConfig.API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      hrimsLogger.error(
        `HRIMS Documents API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    hrimsLogger.info('HRIMS Documents API response received');
    return data;
  } catch (error) {
    hrimsLogger.error({ err: error }, 'Error fetching documents from HRIMS');

    // For development/demo - return mock data
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.HRIMS_MOCK_MODE === 'true'
    ) {
      hrimsLogger.info('Using mock HRIMS documents data for development');
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
  const rejectedForMalware: string[] = [];

  for (const doc of hrimsData.data.documents) {
    try {
      // SECURITY: Scan the document buffer for malware BEFORE persisting.
      // HRIMS is a trusted source, but a compromised HRIMS server or
      // man-in-the-middle attack could deliver malicious content. ClamAV
      // scanning here is the second line of defense (the first being HRIMS
      // auth + TLS).
      if (isClamAVEnabled()) {
        try {
          const buffer = Buffer.from(doc.content, 'base64');
          const scanResult = await scanFile(buffer);
          if (!scanResult.isClean) {
            const reason = scanResult.virusName
              ? `malware: ${scanResult.virusName}`
              : `scan error: ${scanResult.error ?? 'unknown'}`;
            hrimsLogger.error(
              { documentId: doc.id, documentType: doc.type, employeeId, reason },
              'REJECTED HRIMS document — failed ClamAV scan'
            );
            rejectedForMalware.push(doc.id);
            failed++;
            continue;
          }
        } catch (scanErr) {
          // Fail-closed: if ClamAV throws unexpectedly, do not persist the document
          hrimsLogger.error(
            { err: scanErr, documentId: doc.id },
            'ClamAV scan threw — failing closed (document not stored)'
          );
          failed++;
          continue;
        }
      }

      // Update employee with document URL based on type
      const updateData: any = {};
      const fieldName = `${doc.type}Url`;

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
        data: updateData,
      });

      // Record integrity hash so future reads can detect tampering.
      // Hash is computed over the raw bytes (not the data: URL wrapper) for
      // cleaner comparison semantics.
      try {
        const rawBuffer = Buffer.from(doc.content, 'base64');
        await recordDocumentHash(employeeId, fieldName, rawBuffer, null);

        // Post-store verification: read the data back from the DB and confirm
        // the stored bytes still hash to what we just recorded. Catches:
        //  - DB layer mangling the data on write
        //  - Encoding round-trip issues (e.g. base64 vs raw)
        //  - Future migrations that inadvertently transform the column
        const storedEmployee = await db.employee.findUnique({
          where: { id: employeeId },
          select: { [fieldName]: true } as any,
        });
        const storedValue = (storedEmployee as any)?.[fieldName];
        if (storedValue) {
          // The stored value is a data: URL — extract the base64 portion
          const base64Match = storedValue.match(/^data:[^;]+;base64,(.+)$/);
          if (base64Match) {
            const storedBuffer = Buffer.from(base64Match[1], 'base64');
            const verify = await verifyDocumentHash(employeeId, fieldName, storedBuffer);
            if (!verify.ok && verify.reason === 'hash_mismatch') {
              hrimsLogger.error(
                { employeeId, fieldName, expected: verify.expected, actual: verify.actual },
                'CRITICAL: HRIMS document hash mismatch on post-store verification — DB may have corrupted the data'
              );
            }
          }
        }
      } catch (hashErr) {
        // Hash recording failure is non-fatal — the document is stored.
        hrimsLogger.warn(
          { err: hashErr, employeeId, fieldName },
          'Failed to record document integrity hash'
        );
      }

      successful++;
    } catch (error) {
      hrimsLogger.error({ err: error, documentId: doc.id }, `Failed to store document ${doc.id}`);
      failed++;
    }
  }

  if (rejectedForMalware.length > 0) {
    hrimsLogger.error(
      { count: rejectedForMalware.length, documentIds: rejectedForMalware, employeeId },
      'CRITICAL: HRIMS documents rejected for malware. Investigate HRIMS feed integrity.'
    );
  }

  return { successful, failed, rejectedForMalware };
}

// Mock data for development/testing
function getMockHRIMSDocumentsData(
  request: z.infer<typeof hrimsDocumentsRequestSchema>
) {
  return {
    success: true,
    message: 'Employee documents retrieved successfully',
    data: {
      employeeId: request.zanId || request.payrollNumber || 'Z123456789',
      documents: [
        {
          id: 'doc_001',
          type: 'ardhilHali' as const,
          name: 'Ardhil Hali Certificate',
          contentType: 'application/pdf',
          content:
            'JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgQXJkaGlsIEhhbGkgQ2VydGlmaWNhdGUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIwOCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMwMgolJUVPRg==',
          size: 245760,
          lastUpdated: '2025-01-15',
        },
        {
          id: 'doc_002',
          type: 'confirmationLetter' as const,
          name: 'Employment Confirmation Letter',
          contentType: 'application/pdf',
          content:
            'JVBERi0xLjcKCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9MZW5ndGggNTIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgo3MiA3MjAgVGQKKE1vY2sgRW1wbG95bWVudCBDb25maXJtYXRpb24gTGV0dGVyKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozMTAKJSVFT0Y=',
          size: 189432,
          lastUpdated: '2025-02-20',
        },
      ],
      pagination: {
        currentPage: request.page,
        totalPages: 2,
        totalItems: 4,
        hasNext: request.page < 2,
        hasPrev: request.page > 1,
      },
    },
  };
}

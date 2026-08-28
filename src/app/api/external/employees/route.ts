import { NextRequest, NextResponse } from 'next/server';
import { getHrimsApiConfig } from '@/lib/hrims-config';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

function getCorsOrigin(request: NextRequest | Request): string {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  const origin = request.headers.get('origin') || '';
  return allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '');
}

// SECURITY (Req 3.6): this route proxies to the HRIMS external API using server
// credentials (ApiKey/Token). Previously it only checked CSRF, so any caller
// with a valid CSRF token — including unauthenticated ones — could trigger
// server-side requests to HRIMS. Restrict to the HR/commission roles that
// legitimately perform HRIMS employee lookups from the profile page
// (institutional viewers: HRO/HRRP; commission users: HHRMD/HRMO/DO/CSCS/PO;
// plus Admin). withAuth enforces authentication, the role allowlist, and CSRF.
const EXTERNAL_EMPLOYEES_ALLOWED_ROLES = [
  'HRO',
  'HRRP',
  'HHRMD',
  'HRMO',
  'DO',
  'CSCS',
  'PO',
  'Admin',
  'HRO_PEMBA',
  'HRRP_PEMBA',
];

export const POST = wrapHandler(
  withAuth(async (req: Request) => {
    const body = await req.json();

    // Get HRIMS config from environment/database (no hardcoded credentials)
    const hrimsConfig = await getHrimsApiConfig();

    const externalUrl = `${hrimsConfig.BASE_URL}/Employees`;

    logger.info({
      url: externalUrl,
      requestId: body.RequestId,
      requestPayloadData: body.RequestPayloadData,
    }, 'Proxying request to HRIMS');

    // Forward the request to the external API
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        ApiKey: hrimsConfig.API_KEY,
        Token: hrimsConfig.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.error(`HRIMS API responded with status: ${response.status}`);
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();
    logger.info('HRIMS API response received successfully');

    const corsOrigin = getCorsOrigin(req);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }, { allowedRoles: EXTERNAL_EMPLOYEES_ALLOWED_ROLES }),
  'external-employees'
);

export async function OPTIONS(req: NextRequest) {
  const corsOrigin = getCorsOrigin(req);
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

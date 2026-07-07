import { NextRequest, NextResponse } from 'next/server';
import { getHrimsApiConfig } from '@/lib/hrims-config';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

function getCorsOrigin(request: NextRequest | Request): string {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  const origin = request.headers.get('origin') || '';
  return allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '');
}

export const POST = wrapHandler(async (req: NextRequest) => {
  const csrfCheck = await validateCSRF(req);
  if (!csrfCheck.valid) return csrfCheck.response!;

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
}, 'external-employees');

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

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getHrimsConfig,
  saveHrimsConfig,
  testHrimsConnection,
} from '@/lib/hrims-config';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { logConfigChange, getClientIp } from '@/lib/audit-logger';

/**
 * GET - Get current HRIMS configuration (Admin only)
 */
export const GET = wrapHandler(withAuth(async () => {
  const config = await getHrimsConfig();

  // Mask the token for security (only show first/last few characters)
  const maskedToken =
    config.token.length > 20
      ? `${config.token.substring(0, 10)}...${config.token.substring(config.token.length - 10)}`
      : '***';

  // Mask the API key similarly
  const maskedApiKey =
    config.apiKey.length > 10
      ? `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}`
      : '***';

  return NextResponse.json({
    success: true,
    data: {
      host: config.host,
      port: config.port,
      apiKey: maskedApiKey,
      token: maskedToken,
      baseUrl: config.baseUrl,
    },
  });
}, { allowedRoles: ['Admin'] }), 'admin-hrims-settings');

/**
 * PUT - Update HRIMS configuration (Admin only)
 */
export const PUT = wrapHandler(withAuth(async (request: Request, { auth }) => {
  // Step-up re-authentication (Req 14.2): changing the HRIMS integration
  // endpoint + credentials is a Tier-1 sensitive config change.
  const denied = requireReauth(request, 'admin.hrims-settings', auth);
  if (denied) return denied;

  const body = await request.json();
  const { host, port, apiKey, token } = body;


  // Validate required fields
  if (!host || !port) {
    return NextResponse.json(
      {
        success: false,
        message: 'Host and port are required',
      },
      { status: 400 }
    );
  }

  // Validate host format (IP address or hostname)
  const hostPattern =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  if (!hostPattern.test(host)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid host format. Use IP address (e.g., 10.0.217.11) or hostname',
      },
      { status: 400 }
    );
  }

  // Validate port is a number
  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    return NextResponse.json(
      {
        success: false,
        message: 'Port must be a valid number between 1 and 65535',
      },
      { status: 400 }
    );
  }

  // Capture previous config for audit (CRITICAL severity — redirects all sync traffic)
  const previousConfig = await getHrimsConfig();
  const previousHost = previousConfig.host;
  const previousPort = previousConfig.port;
  const apiKeyChanged = !!apiKey && apiKey !== previousConfig.apiKey;
  const tokenChanged = !!token && token !== previousConfig.token;

  // Save the configuration
  await saveHrimsConfig({
    host,
    port: String(portNumber),
    apiKey: apiKey || undefined,
    token: token || undefined,
  });

  // Audit log: HRIMS config change (CRITICAL severity)
  // Redact secret values — only record that they changed
  await logConfigChange({
    configKey: 'HRIMS_CONFIG',
    previousValue: previousHost ? `${previousHost}:${previousPort}` : null,
    newValue: `${host}:${portNumber}`,
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request.headers),
    additionalData: {
      apiKeyChanged,
      tokenChanged,
      // Redact secrets — only log presence + length
      apiKeyLength: apiKey ? apiKey.length : null,
      tokenLength: token ? token.length : null,
    },
  }).catch((err) => {
    logger.error({ err }, 'Failed to write HRIMS_CONFIG_CHANGED audit event');
  });

  return NextResponse.json({
    success: true,
    message: 'HRIMS configuration updated successfully',
    data: {
      host,
      port: String(portNumber),
      baseUrl: `http://${host}:${portNumber}/api`,
    },
  });
}, { allowedRoles: ['Admin'] }), 'admin-hrims-settings');

/**
 * POST - Test HRIMS connection with provided configuration (Admin only)
 */
export const POST = wrapHandler(withAuth(async (request: Request) => {
  const body = await request.json();
  const { host, port, apiKey, token } = body;

  // Validate required fields
  if (!host || !port || !apiKey || !token) {
    return NextResponse.json(
      {
        success: false,
        message: 'Host, port, API key, and token are required for testing',
      },
      { status: 400 }
    );
  }

  const result = await testHrimsConnection({
    host,
    port,
    apiKey,
    token,
  });

  return NextResponse.json({
    success: result.success,
    message: result.message,
    data: {
      responseTime: result.responseTime,
      testedUrl: `http://${host}:${port}/api`,
    },
  });
}, { allowedRoles: ['Admin'] }), 'admin-hrims-settings');

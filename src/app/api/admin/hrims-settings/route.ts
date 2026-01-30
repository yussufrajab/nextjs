import { NextRequest, NextResponse } from 'next/server';
import {
  getHrimsConfig,
  saveHrimsConfig,
  testHrimsConnection,
} from '@/lib/hrims-config';

/**
 * GET - Get current HRIMS configuration
 */
export async function GET() {
  try {
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
        // Include full values only for admin form (they'll be pre-populated)
        _fullApiKey: config.apiKey,
        _fullToken: config.token,
      },
    });
  } catch (error) {
    console.error('Error getting HRIMS config:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get HRIMS configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update HRIMS configuration
 */
export async function PUT(request: NextRequest) {
  try {
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

    // Save the configuration
    await saveHrimsConfig({
      host,
      port: String(portNumber),
      apiKey: apiKey || undefined,
      token: token || undefined,
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
  } catch (error) {
    console.error('Error updating HRIMS config:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update HRIMS configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Test HRIMS connection with provided configuration
 */
export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Error testing HRIMS connection:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to test HRIMS connection',
      },
      { status: 500 }
    );
  }
}

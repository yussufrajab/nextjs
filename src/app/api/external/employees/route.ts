import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // External API details
    const externalUrl = 'http://10.0.217.11:8135/api/Employees';
    const apiKey = '0ea1e3f5-ea57-410b-a199-246fa288b851';
    const token =
      'CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4';

    console.log('Proxying request to HRIMS:', {
      url: externalUrl,
      requestId: body.RequestId,
      requestPayloadData: body.RequestPayloadData,
    });

    // Forward the request to the external API
    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        ApiKey: apiKey,
        Token: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`HRIMS API responded with status: ${response.status}`);
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('HRIMS API response received successfully');

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error proxying to external API:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch external employee data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

export async function GET() {
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Get list of employees
  console.log('🔍 Testing HRIMS API - Get list of employees...');

  const listEmployeesPayload = {
    RequestId: "201",
    RequestPayloadData: {
      PageNumber: 0,
      PageSize: 100
    }
  };

  testResults.tests.push({
    name: 'Get list of employees',
    status: 'running',
    details: 'Testing employee list retrieval with RequestId: 201',
    requestPayload: listEmployeesPayload,
    endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('📤 Sending employee list request:', listEmployeesPayload);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(listEmployeesPayload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Employee list API responded successfully');

      testResults.tests[0] = {
        ...testResults.tests[0],
        status: 'success',
        details: 'Successfully retrieved employee list from HRIMS API',
        responsePayload: data,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          dataStructure: {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            dataType: typeof data,
            responseSize: JSON.stringify(data).length
          }
        }
      };

    } else {
      const errorText = await response.text();
      console.error('❌ Employee list API error:', errorText);

      testResults.tests[0] = {
        ...testResults.tests[0],
        status: 'failed',
        details: `Employee list API returned error status ${response.status}`,
        responsePayload: errorText,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

  } catch (error) {
    console.error('🚨 Employee list connection failed:', error);

    testResults.tests[0] = {
      ...testResults.tests[0],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for employee list',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 2: Get information about a single employee by PayrollNumber
  console.log('🔍 Testing HRIMS API - Get single employee by PayrollNumber...');

  const specificEmployeePayload = {
    RequestId: "202",
    RequestPayloadData: {
      RequestBody: "536151"
    }
  };

  testResults.tests.push({
    name: 'Get information about a single employee by PayrollNumber',
    status: 'running',
    details: 'Testing single employee retrieval with RequestId: 202',
    requestPayload: specificEmployeePayload,
    endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('📤 Sending specific employee request:', specificEmployeePayload);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(specificEmployeePayload),
      signal: AbortSignal.timeout(30000)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Specific employee fetch successful');

      testResults.tests[1] = {
        ...testResults.tests[1],
        status: 'success',
        details: 'Successfully fetched specific employee data from HRIMS API',
        responsePayload: data,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          dataStructure: {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            dataType: typeof data,
            responseSize: JSON.stringify(data).length
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Specific employee API error:', errorText);

      testResults.tests[1] = {
        ...testResults.tests[1],
        status: 'failed',
        details: `Single employee API returned error status ${response.status}`,
        responsePayload: errorText,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

  } catch (error) {
    console.error('🚨 Specific employee connection failed:', error);

    testResults.tests[1] = {
      ...testResults.tests[1],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for specific employee',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 3: Get employee photo
  console.log('🔍 Testing HRIMS API - Get employee photo...');

  const photoPayload = {
    RequestId: "203",
    RequestPayloadData: {
      RequestBody: "536151"
    }
  };

  testResults.tests.push({
    name: 'Get employee photo',
    status: 'running',
    details: 'Testing employee photo retrieval with RequestId: 203',
    requestPayload: photoPayload,
    endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('📤 Sending photo request:', photoPayload);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoPayload),
      signal: AbortSignal.timeout(30000)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Photo fetch successful');

      testResults.tests[2] = {
        ...testResults.tests[2],
        status: 'success',
        details: 'Successfully fetched employee photo from HRIMS API',
        responsePayload: data,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          dataStructure: {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            dataType: typeof data,
            responseSize: JSON.stringify(data).length,
            hasPhotoData: data && data.photo && data.photo.content,
            photoContentLength: data && data.photo && data.photo.content ? data.photo.content.length : 0
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Photo API error:', errorText);

      testResults.tests[2] = {
        ...testResults.tests[2],
        status: 'failed',
        details: `Employee photo API returned error status ${response.status}`,
        responsePayload: errorText,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

  } catch (error) {
    console.error('🚨 Photo fetch connection failed:', error);

    testResults.tests[2] = {
      ...testResults.tests[2],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for employee photo',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  console.log('🏁 All HRIMS API tests completed');

  return NextResponse.json({
    success: true,
    message: 'HRIMS API tests completed with complete request/response payloads',
    data: testResults
  });
}
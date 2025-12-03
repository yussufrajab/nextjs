import { NextRequest, NextResponse } from 'next/server';

// HRIMS API Configuration
const HRIMS_CONFIG = {
  BASE_URL: "http://10.0.217.11:8135/api",
  API_KEY: "0ea1e3f5-ea57-410b-a199-246fa288b851",
  TOKEN: "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
};

interface TestParameters {
  pageNumber?: number;
  pageSize?: number;
  payrollNumber?: string;
  voteCode?: string;
  tinNumber?: string;
}

export async function POST(request: NextRequest) {
  // Parse request body for custom parameters
  let params: TestParameters = {};
  try {
    params = await request.json();
  } catch (error) {
    // Use defaults if parsing fails
  }

  // Set defaults if not provided
  const pageNumber = params.pageNumber ?? 0;
  const pageSize = params.pageSize ?? 100;
  const payrollNumber = params.payrollNumber ?? '536151';
  const voteCode = params.voteCode ?? '004';
  const tinNumber = params.tinNumber ?? '119060370';

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Get list of employees
  console.log('🔍 Testing HRIMS API - Get list of employees...');
  console.log(`Parameters: PageNumber=${pageNumber}, PageSize=${pageSize}`);

  const listEmployeesPayload = {
    RequestId: "201",
    RequestPayloadData: {
      PageNumber: pageNumber,
      PageSize: pageSize
    }
  };

  testResults.tests.push({
    name: 'Get list of employees',
    status: 'running',
    details: `Testing employee list retrieval with RequestId: 201, PageNumber: ${pageNumber}, PageSize: ${pageSize}`,
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
        details: `Successfully retrieved employee list from HRIMS API (Page ${pageNumber}, Size ${pageSize})`,
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
  console.log(`Parameters: PayrollNumber=${payrollNumber}`);

  const specificEmployeePayload = {
    RequestId: "202",
    RequestPayloadData: {
      RequestBody: payrollNumber
    }
  };

  testResults.tests.push({
    name: 'Get information about a single employee by PayrollNumber',
    status: 'running',
    details: `Testing single employee retrieval with RequestId: 202, PayrollNumber: ${payrollNumber}`,
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
        details: `Successfully fetched specific employee data for payroll# ${payrollNumber} from HRIMS API`,
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
  console.log(`Parameters: PayrollNumber=${payrollNumber}`);

  const photoPayload = {
    RequestId: "203",
    RequestPayloadData: {
      RequestBody: payrollNumber
    }
  };

  testResults.tests.push({
    name: 'Get employee photo',
    status: 'running',
    details: `Testing employee photo retrieval with RequestId: 203, PayrollNumber: ${payrollNumber}`,
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
        details: `Successfully fetched employee photo for payroll# ${payrollNumber} from HRIMS API`,
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

  // Test 4: Get employees by Vote Code
  console.log('🔍 Testing HRIMS API - Get employees by Vote Code...');
  console.log(`Parameters: VoteCode=${voteCode}, PageNumber=0, PageSize=10`);

  const voteCodePayload = {
    RequestId: "204",
    RequestPayloadData: {
      PageNumber: 0,
      PageSize: 10,
      RequestBody: voteCode
    }
  };

  testResults.tests.push({
    name: 'Get employees by Vote Code',
    status: 'running',
    details: `Testing employee retrieval by institution vote code with RequestId: 204, VoteCode: ${voteCode}`,
    requestPayload: voteCodePayload,
    endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('📤 Sending vote code request:', voteCodePayload);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voteCodePayload),
      signal: AbortSignal.timeout(30000)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Vote code fetch successful');

      testResults.tests[3] = {
        ...testResults.tests[3],
        status: 'success',
        details: `Successfully fetched employees for vote code ${voteCode} from HRIMS API`,
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
            employeeCount: data?.data?.length || 0
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Vote code API error:', errorText);

      testResults.tests[3] = {
        ...testResults.tests[3],
        status: 'failed',
        details: `Vote code API returned error status ${response.status}`,
        responsePayload: errorText,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

  } catch (error) {
    console.error('🚨 Vote code fetch connection failed:', error);

    testResults.tests[3] = {
      ...testResults.tests[3],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for vote code fetch',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 5: Get employees by TIN Number
  console.log('🔍 Testing HRIMS API - Get employees by TIN Number...');
  console.log(`Parameters: TINNumber=${tinNumber}, PageNumber=0, PageSize=10`);

  const tinPayload = {
    RequestId: "205",
    RequestPayloadData: {
      PageNumber: 0,
      PageSize: 10,
      RequestBody: tinNumber
    }
  };

  testResults.tests.push({
    name: 'Get employees by TIN Number',
    status: 'running',
    details: `Testing employee retrieval by institution TIN number with RequestId: 205, TIN: ${tinNumber}`,
    requestPayload: tinPayload,
    endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('📤 Sending TIN request:', tinPayload);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tinPayload),
      signal: AbortSignal.timeout(30000)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ TIN fetch successful');

      testResults.tests[4] = {
        ...testResults.tests[4],
        status: 'success',
        details: `Successfully fetched employees for TIN ${tinNumber} from HRIMS API`,
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
            employeeCount: data?.data?.length || 0
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ TIN API error:', errorText);

      testResults.tests[4] = {
        ...testResults.tests[4],
        status: 'failed',
        details: `TIN API returned error status ${response.status}`,
        responsePayload: errorText,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

  } catch (error) {
    console.error('🚨 TIN fetch connection failed:', error);

    testResults.tests[4] = {
      ...testResults.tests[4],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for TIN fetch',
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

// Keep GET method for backwards compatibility
export async function GET() {
  return POST(new NextRequest('http://localhost/api/hrims/test', { method: 'POST' }));
}

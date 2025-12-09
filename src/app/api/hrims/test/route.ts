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
  photoSearchCriteria?: string;
  voteCode?: string;
  tinNumber?: string;
  documentsSearchCriteria?: string;
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
  const pageSize = params.pageSize ?? 10; // Use smaller default for testing to avoid timeouts
  const payrollNumber = params.payrollNumber ?? '536151';
  const photoSearchCriteria = params.photoSearchCriteria ?? '111660';
  const voteCode = params.voteCode ?? '004';
  const tinNumber = params.tinNumber ?? '119060370';
  const documentsSearchCriteria = params.documentsSearchCriteria ?? '149391';

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  // Test 1: Get information about a single employee by PayrollNumber
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

      testResults.tests[0] = {
        ...testResults.tests[0],
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

      testResults.tests[0] = {
        ...testResults.tests[0],
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

    testResults.tests[0] = {
      ...testResults.tests[0],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for specific employee',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 2: Get employee photo
  console.log('🔍 Testing HRIMS API - Get employee photo...');
  console.log(`Parameters: SearchCriteria=${photoSearchCriteria}`);

  const photoPayload = {
    RequestId: "203",
    SearchCriteria: photoSearchCriteria
  };

  testResults.tests.push({
    name: 'Get employee photo',
    status: 'running',
    details: `Testing employee photo retrieval with RequestId: 203, SearchCriteria: ${photoSearchCriteria}`,
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

      testResults.tests[1] = {
        ...testResults.tests[1],
        status: 'success',
        details: `Successfully fetched employee photo with SearchCriteria: ${photoSearchCriteria} from HRIMS API`,
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

      testResults.tests[1] = {
        ...testResults.tests[1],
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

    testResults.tests[1] = {
      ...testResults.tests[1],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for employee photo',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 3: Get employees by Vote Code (with pagination)
  console.log('🔍 Testing HRIMS API - Get employees by Vote Code...');
  console.log(`Parameters: VoteCode=${voteCode}, PageNumber=${pageNumber}, PageSize=${pageSize}`);

  const voteCodePayload = {
    RequestId: "204",
    RequestPayloadData: {
      PageNumber: pageNumber,
      PageSize: pageSize,
      RequestBody: voteCode
    }
  };

  testResults.tests.push({
    name: 'Get employees by Vote Code (Paginated)',
    status: 'running',
    details: `Testing employee retrieval by institution vote code with RequestId: 204, VoteCode: ${voteCode}, Page: ${pageNumber}, Size: ${pageSize}`,
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
      signal: AbortSignal.timeout(120000) // 2 minute timeout for paginated requests
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Vote code fetch successful');

      testResults.tests[2] = {
        ...testResults.tests[2],
        status: 'success',
        details: `Successfully fetched employees for vote code ${voteCode} from HRIMS API (Page ${data.currentPage || pageNumber}, ${data?.data?.length || 0} records)`,
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
            employeeCount: data?.data?.length || 0,
            paginationInfo: {
              currentPage: data?.currentPage,
              currentDataSize: data?.currentDataSize,
              overallDataSize: data?.overallDataSize
            }
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Vote code API error:', errorText);

      testResults.tests[2] = {
        ...testResults.tests[2],
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

    testResults.tests[2] = {
      ...testResults.tests[2],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for vote code fetch',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 4: Get employees by TIN Number (with pagination)
  console.log('🔍 Testing HRIMS API - Get employees by TIN Number...');
  console.log(`Parameters: TINNumber=${tinNumber}, PageNumber=${pageNumber}, PageSize=${pageSize}`);

  const tinPayload = {
    RequestId: "205",
    RequestPayloadData: {
      PageNumber: pageNumber,
      PageSize: pageSize,
      RequestBody: tinNumber
    }
  };

  testResults.tests.push({
    name: 'Get employees by TIN Number (Paginated)',
    status: 'running',
    details: `Testing employee retrieval by institution TIN number with RequestId: 205, TIN: ${tinNumber}, Page: ${pageNumber}, Size: ${pageSize}`,
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
      signal: AbortSignal.timeout(120000) // 2 minute timeout for paginated requests
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ TIN fetch successful');

      testResults.tests[3] = {
        ...testResults.tests[3],
        status: 'success',
        details: `Successfully fetched employees for TIN ${tinNumber} from HRIMS API (Page ${data.currentPage || pageNumber}, ${data?.data?.length || 0} records)`,
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
            employeeCount: data?.data?.length || 0,
            paginationInfo: {
              currentPage: data?.currentPage,
              currentDataSize: data?.currentDataSize,
              overallDataSize: data?.overallDataSize
            }
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ TIN API error:', errorText);

      testResults.tests[3] = {
        ...testResults.tests[3],
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

    testResults.tests[3] = {
      ...testResults.tests[3],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for TIN fetch',
      error: {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }

  // Test 5: Get employee documents by PayrollNumber
  console.log('🔍 Testing HRIMS API - Get employee documents...');
  console.log(`Parameters: SearchCriteria=${documentsSearchCriteria}`);

  const documentsPayload = {
    RequestId: "206",
    SearchCriteria: documentsSearchCriteria
  };

  testResults.tests.push({
    name: 'Get employee documents',
    status: 'running',
    details: `Testing employee document retrieval with RequestId: 206, SearchCriteria: ${documentsSearchCriteria}`,
    requestPayload: documentsPayload,
    endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
    headers: {
      'ApiKey': HRIMS_CONFIG.API_KEY,
      'Token': HRIMS_CONFIG.TOKEN,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('📤 Sending employee documents request:', documentsPayload);

    const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
      method: 'POST',
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentsPayload),
      signal: AbortSignal.timeout(480000) // 2 minute timeout for document retrieval
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Employee documents API responded successfully');

      testResults.tests[4] = {
        ...testResults.tests[4],
        status: 'success',
        details: `Successfully retrieved employee documents from HRIMS API for SearchCriteria ${documentsSearchCriteria}`,
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
            documentFields: data?.data ? Object.keys(data.data) : []
          }
        }
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Employee documents API error:', errorText);

      testResults.tests[4] = {
        ...testResults.tests[4],
        status: 'failed',
        details: `Employee documents API returned error status ${response.status}`,
        responsePayload: errorText,
        responseInfo: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    }

  } catch (error) {
    console.error('🚨 Employee documents fetch connection failed:', error);

    testResults.tests[4] = {
      ...testResults.tests[4],
      status: 'failed',
      details: 'Failed to connect to HRIMS API for employee documents',
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

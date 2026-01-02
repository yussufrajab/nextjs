import { NextRequest, NextResponse } from 'next/server';

// Utility function to add delay between tests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  selectedTests?: string[]; // Array of test IDs to run
  selectedDocumentTypes?: string[]; // Document types for Test 5: "2"=Ardhilihal, "3"=Employment Contract, "4"=Birth Certificate, "8"=Educational Certificate, "23"=Confirmation Letter
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
  const selectedTests = params.selectedTests ?? ['test1', 'test2', 'test3', 'test4', 'test5'];
  const selectedDocumentTypes = params.selectedDocumentTypes ?? ['2', '3', '4', '8', '23']; // All document types by default

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [] as any[]
  };

  console.log(`🧪 Running selected tests: ${selectedTests.join(', ')}`);

  // Test 1: Get information about a single employee by PayrollNumber
  if (selectedTests.includes('test1')) {
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

  // Wait before next test if more tests are selected
  if (selectedTests.filter(t => ['test2', 'test3', 'test4', 'test5'].includes(t)).length > 0) {
    console.log('⏳ Waiting 2 seconds before next test...');
    await delay(2000);
  }
  } // End test1

  // Test 2: Get employee photo
  if (selectedTests.includes('test2')) {
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

  // Wait before next test if more tests are selected
  if (selectedTests.filter(t => ['test3', 'test4', 'test5'].includes(t)).length > 0) {
    console.log('⏳ Waiting 2 seconds before next test...');
    await delay(2000);
  }
  } // End test2

  // Test 3: Get employees by Vote Code (with pagination)
  if (selectedTests.includes('test3')) {
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

  // Wait longer after heavy paginated query if more tests are selected
  if (selectedTests.filter(t => ['test4', 'test5'].includes(t)).length > 0) {
    console.log('⏳ Waiting 3 seconds before next test (after heavy paginated query)...');
    await delay(3000);
  }
  } // End test3

  // Test 4: Get employees by TIN Number (with pagination)
  if (selectedTests.includes('test4')) {
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

  // Wait longer after heavy paginated query before testing documents if test5 is selected
  if (selectedTests.includes('test5')) {
    console.log('⏳ Waiting 5 seconds before document test (critical - let HRIMS server fully recover)...');
    await delay(5000);
  }
  } // End test4

  // Test 5: Get employee documents by PayrollNumber (Direct HRIMS API call with multiple document types)
  if (selectedTests.includes('test5')) {
  console.log('🔍 Testing HRIMS API - Get employee documents (Direct API call with multiple document types)...');
  console.log(`Parameters: SearchCriteria=${documentsSearchCriteria}, Document Types: ${selectedDocumentTypes.join(', ')}`);
  console.log(`⚠️ NOTE: This test calls HRIMS directly (no cache). HRIMS now splits by document type to reduce payload.`);

  // Document type mapping for display
  const documentTypeNames: Record<string, string> = {
    '2': 'Ardhilihal',
    '3': 'Employment Contract',
    '4': 'Birth Certificate',
    '8': 'Educational Certificate',
    '23': 'Confirmation Letter'
  };

  // Make a separate API call for each selected document type
  for (let i = 0; i < selectedDocumentTypes.length; i++) {
    const docType = selectedDocumentTypes[i];
    const docTypeName = documentTypeNames[docType] || `Unknown (${docType})`;

    console.log(`\n📄 Fetching document type: ${docTypeName} (RequestBody: ${docType})...`);

    const documentsPayload = {
      RequestId: "206",
      SearchCriteria: documentsSearchCriteria,
      RequestPayloadData: {
        RequestBody: docType
      }
    };

    // Determine the correct test index based on which tests are selected
    const testIndex = testResults.tests.length;

    testResults.tests.push({
      name: `Get employee documents - ${docTypeName} (Direct HRIMS API)`,
      status: 'running',
      details: `Testing employee document retrieval with RequestId: 206, SearchCriteria: ${documentsSearchCriteria}, RequestBody: ${docType} (${docTypeName}). Timeout: 120 seconds.`,
      requestPayload: documentsPayload,
      endpoint: `${HRIMS_CONFIG.BASE_URL}/Employees`,
      headers: {
        'ApiKey': HRIMS_CONFIG.API_KEY,
        'Token': HRIMS_CONFIG.TOKEN,
        'Content-Type': 'application/json'
      }
    });

    try {
      console.log('📤 Sending employee documents request to HRIMS:', documentsPayload);
      console.log('⏱️ Waiting up to 120 seconds for HRIMS response...');

      const response = await fetch(`${HRIMS_CONFIG.BASE_URL}/Employees`, {
        method: 'POST',
        headers: {
          'ApiKey': HRIMS_CONFIG.API_KEY,
          'Token': HRIMS_CONFIG.TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentsPayload),
        signal: AbortSignal.timeout(120000) // 120 second timeout
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();

        // Check if HRIMS returned an error in the response body
        if (data.code === 500 || data.status === 'Failure') {
          console.error('❌ HRIMS internal error:', data.message);

          // Check if it's a timeout error from HRIMS
          const isTimeoutError = data.description && data.description.includes('Timeout');

          testResults.tests[testIndex] = {
            ...testResults.tests[testIndex],
            status: 'failed',
            details: isTimeoutError
              ? `HRIMS server timeout for ${docTypeName}: ${data.description}. The HRIMS server couldn't process this request in time. Try: 1) Use a different payroll number with fewer documents, 2) Check HRIMS server performance.`
              : `HRIMS API error for ${docTypeName}: ${data.message} - ${data.description}`,
            responsePayload: data,
            responseInfo: {
              status: response.status,
              statusText: response.statusText,
              documentType: docTypeName,
              requestBody: docType,
              hrimsErrorCode: data.code,
              hrimsStatus: data.status,
              hrimsMessage: data.message,
              hrimsDescription: data.description,
              suggestion: isTimeoutError ? 'Try a different payroll number or check HRIMS server' : 'Check HRIMS API documentation'
            }
          };
        } else {
          console.log(`✅ Employee documents API responded successfully for ${docTypeName}`);

          // Count documents in response
          const attachments = Array.isArray(data.data) ? data.data : [];
          const documentCount = attachments.length;

          testResults.tests[testIndex] = {
            ...testResults.tests[testIndex],
            status: 'success',
            details: `Successfully retrieved ${docTypeName} documents from HRIMS API for SearchCriteria ${documentsSearchCriteria}. Received ${documentCount} document(s) with base64 encoded content.`,
            responsePayload: data,
            responseInfo: {
              status: response.status,
              statusText: response.statusText,
              documentType: docTypeName,
              requestBody: docType,
              headers: Object.fromEntries(response.headers.entries()),
              dataStructure: {
                hasData: !!data,
                dataKeys: data ? Object.keys(data) : [],
                dataType: typeof data,
                responseSize: JSON.stringify(data).length,
                documentCount: documentCount,
                documentFields: attachments.length > 0 ? Object.keys(attachments[0]) : []
              }
            }
          };
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Employee documents API error for ${docTypeName}:`, errorText);

        testResults.tests[testIndex] = {
          ...testResults.tests[testIndex],
          status: 'failed',
          details: `Employee documents API returned HTTP error status ${response.status} for ${docTypeName}`,
          responsePayload: errorText,
          responseInfo: {
            status: response.status,
            statusText: response.statusText,
            documentType: docTypeName,
            requestBody: docType,
            headers: Object.fromEntries(response.headers.entries())
          }
        };
      }

    } catch (error) {
      console.error(`🚨 Employee documents fetch connection failed for ${docTypeName}:`, error);

      testResults.tests[testIndex] = {
        ...testResults.tests[testIndex],
        status: 'failed',
        details: `Failed to connect to HRIMS API for employee documents (${docTypeName})`,
        error: {
          name: error instanceof Error ? error.name : 'Unknown Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          documentType: docTypeName,
          requestBody: docType
        }
      };
    }

    // Add delay between document type requests if there are more to fetch
    if (i < selectedDocumentTypes.length - 1) {
      console.log('⏳ Waiting 2 seconds before next document type request...');
      await delay(2000);
    }
  }

  console.log(`✅ Completed fetching ${selectedDocumentTypes.length} document type(s)`);
  } // End test5

  console.log(`🏁 Completed ${testResults.tests.length} HRIMS API test(s)`);

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

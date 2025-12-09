'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import React, { useState } from 'react';
import { Loader2, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  name: string;
  status: 'success' | 'failed' | 'running';
  details: string;
  response?: any;
  error?: any;
}

interface TestData {
  timestamp: string;
  tests: TestResult[];
}

interface TestParameters {
  pageNumber: number;
  pageSize: number;
  payrollNumber: string;
  photoSearchCriteria: string;
  voteCode: string;
  tinNumber: string;
  documentsSearchCriteria: string;
}

export default function TestHRIMSPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestData | null>(null);

  // Test parameters
  const [parameters, setParameters] = useState<TestParameters>({
    pageNumber: 0,
    pageSize: 10,
    payrollNumber: '536151',
    photoSearchCriteria: '111660',
    voteCode: '004',
    tinNumber: '119060370',
    documentsSearchCriteria: '149391'
  });

  const runHRIMSTests = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      toast({
        title: "Running Tests",
        description: "Testing HRIMS API connectivity and data fetching...",
      });

      const response = await fetch('/api/hrims/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters)
      });

      if (!response.ok) {
        throw new Error(`Test API failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setTestResults(result.data);

        const successCount = result.data.tests.filter((t: TestResult) => t.status === 'success').length;
        const totalCount = result.data.tests.length;

        toast({
          title: "Tests Completed",
          description: `${successCount}/${totalCount} tests passed`,
          variant: successCount === totalCount ? "default" : "destructive"
        });
      } else {
        throw new Error(result.message || 'Tests failed');
      }

    } catch (error) {
      console.error('Test execution failed:', error);
      toast({
        title: "Test Execution Failed",
        description: error instanceof Error ? error.message : "Failed to run HRIMS tests",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div>
      <PageHeader
        title="Test HRIMS Integration"
        description="Test connectivity and data fetching from the HRIMS external API with custom parameters"
      />

      {/* Test Parameters Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Parameters</CardTitle>
          <CardDescription>
            Configure the parameters for testing the HRIMS API integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="payrollNumber">Payroll Number (Test 1)</Label>
              <Input
                id="payrollNumber"
                type="text"
                value={parameters.payrollNumber}
                onChange={(e) => setParameters({ ...parameters, payrollNumber: e.target.value })}
                placeholder="536151"
              />
              <p className="text-xs text-gray-500">For specific employee data</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoSearchCriteria">Photo Search (Test 2)</Label>
              <Input
                id="photoSearchCriteria"
                type="text"
                value={parameters.photoSearchCriteria}
                onChange={(e) => setParameters({ ...parameters, photoSearchCriteria: e.target.value })}
                placeholder="111660"
              />
              <p className="text-xs text-gray-500">Employee ID for photo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voteCode">Vote Code (Test 3)</Label>
              <Input
                id="voteCode"
                type="text"
                value={parameters.voteCode}
                onChange={(e) => setParameters({ ...parameters, voteCode: e.target.value })}
                placeholder="004"
              />
              <p className="text-xs text-gray-500">Institution vote code</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="tinNumber">TIN Number (Test 4)</Label>
              <Input
                id="tinNumber"
                type="text"
                value={parameters.tinNumber}
                onChange={(e) => setParameters({ ...parameters, tinNumber: e.target.value })}
                placeholder="119060370"
              />
              <p className="text-xs text-gray-500">Institution TIN</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentsSearchCriteria">Documents Search (Test 5)</Label>
              <Input
                id="documentsSearchCriteria"
                type="text"
                value={parameters.documentsSearchCriteria}
                onChange={(e) => setParameters({ ...parameters, documentsSearchCriteria: e.target.value })}
                placeholder="149391"
              />
              <p className="text-xs text-gray-500">Employee ID for documents</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size (Tests 3, 4)</Label>
              <Input
                id="pageSize"
                type="number"
                min="1"
                max="100"
                value={parameters.pageSize}
                onChange={(e) => setParameters({ ...parameters, pageSize: parseInt(e.target.value) || 10 })}
                placeholder="10"
              />
              <p className="text-xs text-gray-500">Records per page</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pageNumber">Page Number (Tests 3, 4)</Label>
              <Input
                id="pageNumber"
                type="number"
                min="0"
                value={parameters.pageNumber}
                onChange={(e) => setParameters({ ...parameters, pageNumber: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">For pagination</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            HRIMS API Tests
          </CardTitle>
          <CardDescription>
            These tests will verify connection to the HRIMS system and test data fetching capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runHRIMSTests}
            disabled={isRunning}
            className="flex items-center gap-2"
            size="lg"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
            {isRunning ? 'Running Tests...' : 'Run HRIMS Tests'}
          </Button>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Tests will verify:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Test 1:</strong> Specific employee data fetching (RequestId: 202) - for payroll# {parameters.payrollNumber}</li>
              <li><strong>Test 2:</strong> Employee photo fetching (RequestId: 203) - for ID {parameters.photoSearchCriteria}</li>
              <li><strong>Test 3:</strong> Employees by Vote Code (RequestId: 204) - paginated (page {parameters.pageNumber}, size {parameters.pageSize}) for votecode {parameters.voteCode}</li>
              <li><strong>Test 4:</strong> Employees by TIN Number (RequestId: 205) - paginated (page {parameters.pageNumber}, size {parameters.pageSize}) for TIN {parameters.tinNumber}</li>
              <li><strong>Test 5:</strong> Employee documents fetching (RequestId: 206) - for ID {parameters.documentsSearchCriteria}</li>
            </ul>
            <p className="mt-3 text-blue-700 font-medium">
              💡 Tests 3 & 4 include pagination metadata (overallDataSize, currentDataSize, currentPage) in the response.
            </p>
            <p className="mt-2 text-amber-700 text-xs">
              ⚠️ Use page size 10-20 for testing. Larger values may cause timeouts for institutions with many employees. The actual fetch operation will automatically loop through all pages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Executed at: {new Date(testResults.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.tests.map((test, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <h4 className="font-medium">{test.name}</h4>
                  </div>
                  {getStatusBadge(test.status)}
                </div>

                <p className="text-sm text-gray-600 mb-3">{test.details}</p>

                {/* Request Payload */}
                {(test as any).requestPayload && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                    <h5 className="font-medium text-blue-800 mb-2">📤 Request Details:</h5>
                    <div className="text-sm space-y-2">
                      <p><strong>Endpoint:</strong> {(test as any).endpoint}</p>
                      <div>
                        <strong>Headers:</strong>
                        <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto">
                          {JSON.stringify((test as any).headers, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <strong>Request Payload (JSON):</strong>
                        <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto">
                          {JSON.stringify((test as any).requestPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Response */}
                {test.status === 'success' && (test as any).responsePayload && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <h5 className="font-medium text-green-800 mb-2">✅ Response Details:</h5>
                    <div className="text-sm space-y-2">
                      {(test as any).responseInfo && (
                        <>
                          <p><strong>HTTP Status:</strong> {(test as any).responseInfo.status} {(test as any).responseInfo.statusText}</p>
                          <p><strong>Response Size:</strong> {(test as any).responseInfo.dataStructure?.responseSize} characters</p>
                          <p><strong>Data Keys:</strong> {(test as any).responseInfo.dataStructure?.dataKeys?.join(', ') || 'None'}</p>
                          {(test as any).responseInfo.dataStructure?.employeeCount !== undefined && (
                            <p><strong>Employee Count:</strong> {(test as any).responseInfo.dataStructure.employeeCount}</p>
                          )}
                          {(test as any).responseInfo.dataStructure?.paginationInfo && (
                            <div className="border-t border-green-300 pt-2 mt-2">
                              <p className="font-semibold text-green-900 mb-1">📄 Pagination Info:</p>
                              <p><strong>Current Page:</strong> {(test as any).responseInfo.dataStructure.paginationInfo.currentPage}</p>
                              <p><strong>Current Data Size:</strong> {(test as any).responseInfo.dataStructure.paginationInfo.currentDataSize}</p>
                              <p><strong>Overall Data Size:</strong> {(test as any).responseInfo.dataStructure.paginationInfo.overallDataSize}</p>
                              {(test as any).responseInfo.dataStructure.paginationInfo.overallDataSize > (test as any).responseInfo.dataStructure.paginationInfo.currentDataSize && (
                                <p className="text-blue-700 mt-1">💡 More pages available to fetch</p>
                              )}
                            </div>
                          )}
                          {(test as any).responseInfo.dataStructure?.hasPhotoData !== undefined && (
                            <p><strong>Has Photo Data:</strong> {(test as any).responseInfo.dataStructure.hasPhotoData ? 'Yes' : 'No'}</p>
                          )}
                          {(test as any).responseInfo.dataStructure?.photoContentLength && (
                            <p><strong>Photo Content Length:</strong> {(test as any).responseInfo.dataStructure.photoContentLength} characters</p>
                          )}
                        </>
                      )}
                      <div>
                        <strong>Complete Response Payload (JSON):</strong>
                        <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto max-h-96">
                          {JSON.stringify((test as any).responsePayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Failed Response */}
                {test.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <h5 className="font-medium text-red-800 mb-2">❌ Error Details:</h5>
                    <div className="text-sm space-y-2">
                      {(test as any).responseInfo && (
                        <>
                          <p><strong>HTTP Status:</strong> {(test as any).responseInfo.status} {(test as any).responseInfo.statusText}</p>
                        </>
                      )}
                      {test.error?.status && <p><strong>Status:</strong> {test.error.status} {test.error.statusText}</p>}
                      {test.error?.message && <p><strong>Message:</strong> {test.error.message}</p>}
                      {(test as any).responsePayload && (
                        <div>
                          <strong>Error Response Payload:</strong>
                          <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto max-h-48">
                            {typeof (test as any).responsePayload === 'string'
                              ? (test as any).responsePayload
                              : JSON.stringify((test as any).responsePayload, null, 2)
                            }
                          </pre>
                        </div>
                      )}
                      {test.error?.body && (
                        <div>
                          <strong>Response Body:</strong>
                          <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto max-h-48">
                            {test.error.body}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p><strong>If tests pass:</strong> The HRIMS integration is working correctly and you can proceed to use the "Fetch Data" feature.</p>
            <p><strong>If tests fail with connection errors:</strong> Check if the HRIMS server at 10.0.217.11:8135 is accessible from your network.</p>
            <p><strong>If tests fail with 401/403 errors:</strong> The API credentials may need to be updated.</p>
            <p><strong>If tests fail with different response format:</strong> The HRIMS API structure may have changed from the documentation.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

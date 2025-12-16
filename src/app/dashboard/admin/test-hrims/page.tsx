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
  selectedTests: string[]; // Array of test IDs to run
  selectedDocumentTypes: string[]; // Document types for Test 5: "2"=Ardhilihal, "3"=Employment Contract, "4"=Birth Certificate, "8"=Educational Certificate, "23"=Confirmation Letter
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
    documentsSearchCriteria: '149391',
    selectedTests: ['test1', 'test2', 'test3', 'test4', 'test5'], // All tests by default
    selectedDocumentTypes: ['2', '3', '4', '8', '23'] // All document types by default
  });

  // Toggle test selection
  const toggleTest = (testId: string) => {
    setParameters(prev => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter(id => id !== testId)
        : [...prev.selectedTests, testId]
    }));
  };

  // Toggle document type selection
  const toggleDocumentType = (docType: string) => {
    setParameters(prev => ({
      ...prev,
      selectedDocumentTypes: prev.selectedDocumentTypes.includes(docType)
        ? prev.selectedDocumentTypes.filter(type => type !== docType)
        : [...prev.selectedDocumentTypes, docType]
    }));
  };

  // Select/deselect all tests
  const toggleAllTests = () => {
    setParameters(prev => ({
      ...prev,
      selectedTests: prev.selectedTests.length === 5 ? [] : ['test1', 'test2', 'test3', 'test4', 'test5']
    }));
  };

  // Quick select presets
  const selectOnlyTest5 = () => {
    setParameters(prev => ({ ...prev, selectedTests: ['test5'] }));
  };

  const selectQuickTests = () => {
    setParameters(prev => ({ ...prev, selectedTests: ['test1', 'test2'] }));
  };

  const runHRIMSTests = async () => {
    // Validate that at least one test is selected
    if (parameters.selectedTests.length === 0) {
      toast({
        title: "No Tests Selected",
        description: "Please select at least one test to run",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestResults(null);

    try {
      const testCount = parameters.selectedTests.length;
      toast({
        title: "Running Tests",
        description: `Testing ${testCount} selected HRIMS API ${testCount === 1 ? 'endpoint' : 'endpoints'}...`,
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

      if (result.success && result.data) {
        setTestResults(result.data);

        const successCount = result.data.tests?.filter((t: TestResult) => t && t.status === 'success').length || 0;
        const totalCount = result.data.tests?.length || 0;

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

      {/* Test Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Tests to Run</CardTitle>
          <CardDescription>
            Choose which HRIMS API tests to execute. Run tests individually to avoid server overload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b">
              <input
                type="checkbox"
                id="select-all"
                checked={parameters.selectedTests.length === 5}
                onChange={toggleAllTests}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="select-all" className="font-semibold cursor-pointer">
                Select/Deselect All Tests
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  id="test1"
                  checked={parameters.selectedTests.includes('test1')}
                  onChange={() => toggleTest('test1')}
                  className="h-4 w-4 rounded border-gray-300 mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="test1" className="font-medium cursor-pointer">
                    Test 1: Single Employee Data
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">RequestId: 202 - Fetch employee by payroll number</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  id="test2"
                  checked={parameters.selectedTests.includes('test2')}
                  onChange={() => toggleTest('test2')}
                  className="h-4 w-4 rounded border-gray-300 mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="test2" className="font-medium cursor-pointer">
                    Test 2: Employee Photo
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">RequestId: 203 - Fetch employee photo</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  id="test3"
                  checked={parameters.selectedTests.includes('test3')}
                  onChange={() => toggleTest('test3')}
                  className="h-4 w-4 rounded border-gray-300 mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="test3" className="font-medium cursor-pointer">
                    Test 3: Employees by Vote Code
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">RequestId: 204 - Paginated fetch (can be slow)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  id="test4"
                  checked={parameters.selectedTests.includes('test4')}
                  onChange={() => toggleTest('test4')}
                  className="h-4 w-4 rounded border-gray-300 mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="test4" className="font-medium cursor-pointer">
                    Test 4: Employees by TIN Number
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">RequestId: 205 - Paginated fetch (can be slow)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 md:col-span-2 bg-amber-50 border-amber-300">
                <input
                  type="checkbox"
                  id="test5"
                  checked={parameters.selectedTests.includes('test5')}
                  onChange={() => toggleTest('test5')}
                  className="h-4 w-4 rounded border-gray-300 mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="test5" className="font-medium cursor-pointer">
                    Test 5: Employee Documents (RequestId 206) - Multiple Calls by Document Type (120s timeout)
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">Direct HRIMS API calls - HRIMS now splits documents by type (Ardhilihal, Employment Contract, Birth Certificate, Educational Certificate, Confirmation Letter) to reduce payload. Each selected document type makes a separate API call with 120s timeout to prevent timeouts.</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-2">Quick Select:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectOnlyTest5}
                  className="text-xs"
                >
                  Only Test 5 (Documents)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectQuickTests}
                  className="text-xs"
                >
                  Quick Tests (1 & 2)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllTests}
                  className="text-xs"
                >
                  {parameters.selectedTests.length === 5 ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            {parameters.selectedTests.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>{parameters.selectedTests.length}</strong> test{parameters.selectedTests.length !== 1 ? 's' : ''} selected
                  {parameters.selectedTests.length > 1 && (
                    <span className="ml-2 text-blue-600">• Tests will run sequentially with delays between them</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

              {/* Document Type Selection for Test 5 */}
              <div className="mt-3 p-3 border rounded-lg bg-amber-50 border-amber-300">
                <Label className="font-medium mb-2 block">Document Types to Fetch:</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="docType2"
                      checked={parameters.selectedDocumentTypes.includes('2')}
                      onChange={() => toggleDocumentType('2')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="docType2" className="text-sm cursor-pointer">
                      Ardhilihal (RequestBody: 2)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="docType3"
                      checked={parameters.selectedDocumentTypes.includes('3')}
                      onChange={() => toggleDocumentType('3')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="docType3" className="text-sm cursor-pointer">
                      Employment Contract (RequestBody: 3)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="docType4"
                      checked={parameters.selectedDocumentTypes.includes('4')}
                      onChange={() => toggleDocumentType('4')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="docType4" className="text-sm cursor-pointer">
                      Birth Certificate (RequestBody: 4)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="docType8"
                      checked={parameters.selectedDocumentTypes.includes('8')}
                      onChange={() => toggleDocumentType('8')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="docType8" className="text-sm cursor-pointer">
                      Educational Certificate (RequestBody: 8)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="docType23"
                      checked={parameters.selectedDocumentTypes.includes('23')}
                      onChange={() => toggleDocumentType('23')}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="docType23" className="text-sm cursor-pointer">
                      Confirmation Letter (RequestBody: 23)
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  HRIMS now splits documents by type to reduce payload and prevent timeouts. Select which document types to fetch.
                </p>
              </div>
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
              <li><strong>Test 5:</strong> Employee documents fetching (RequestId: 206) - Direct HRIMS API call for PayrollNumber {parameters.documentsSearchCriteria}. Fetches {parameters.selectedDocumentTypes.length} document type(s): {parameters.selectedDocumentTypes.map(t => t === '2' ? 'Ardhilihal' : t === '3' ? 'Employment Contract' : t === '4' ? 'Birth Certificate' : t === '8' ? 'Educational Certificate' : 'Confirmation Letter').join(', ')}. Each type uses 120s timeout.</li>
            </ul>
            <p className="mt-3 text-blue-700 font-medium">
              💡 Tests 3 & 4 include pagination metadata (overallDataSize, currentDataSize, currentPage) in the response.
            </p>
            <p className="mt-2 text-amber-700 font-medium">
              ⚠️ Test 5 makes direct HRIMS API calls to verify integration. HRIMS now splits documents by type (Ardhilihal, Employment Contract, Birth Certificate, Educational Certificate, Confirmation Letter) to reduce payload and prevent timeouts. Each selected document type makes a separate API call with 120s timeout. Note: The profile page works because it uses cached documents from MinIO.
            </p>
            <p className="mt-2 text-amber-700 text-xs">
              ⚠️ Use page size 10-20 for testing. Larger values may cause timeouts for institutions with many employees. The actual fetch operation will automatically loop through all pages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && testResults.tests && testResults.tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Executed at: {new Date(testResults.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResults.tests?.filter(test => test != null).map((test, index) => (
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

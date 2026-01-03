'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';

interface Institution {
  id: string;
  name: string;
  voteNumber: string | null;
  tinNumber: string | null;
}

interface DocumentResult {
  employeeId: string;
  employeeName: string;
  payrollNumber: string;
  documentsStored: {
    ardhilHali?: string;
    confirmationLetter?: string;
    jobContract?: string;
    birthCertificate?: string;
  };
  certificatesStored: Array<{
    type: string;
    fileUrl: string;
  }>;
  status: 'success' | 'partial' | 'failed';
  message?: string;
}

interface FetchResponse {
  success: boolean;
  message: string;
  summary: {
    total: number;
    successful: number;
    partial: number;
    failed: number;
  };
  results: DocumentResult[];
}

export default function GetDocumentsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<
    Institution[]
  >([]);
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInstitutions, setIsFetchingInstitutions] = useState(true);
  const [results, setResults] = useState<FetchResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    employee?: string;
    status?: string;
    summary?: {
      successful: number;
      partial: number;
      failed: number;
    };
  } | null>(null);

  const itemsPerPage = 10;

  // Fetch institutions on mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch('/api/institutions');
        if (response.ok) {
          const result = await response.json();
          setInstitutions(result.data || []);
          setFilteredInstitutions(result.data || []);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load institutions',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching institutions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load institutions',
          variant: 'destructive',
        });
      } finally {
        setIsFetchingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, []);

  // Filter institutions based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredInstitutions(institutions);
    } else {
      const filtered = institutions.filter(
        (inst) =>
          inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inst.voteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inst.tinNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInstitutions(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, institutions]);

  // Paginated institutions
  const paginatedInstitutions = filteredInstitutions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalInstitutionPages = Math.ceil(
    filteredInstitutions.length / itemsPerPage
  );

  const handleFetchDocuments = async () => {
    if (!selectedInstitution) {
      toast({
        title: 'Error',
        description: 'Please select an institution',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResults(null);
    setProgress(null);

    try {
      const response = await fetch(
        '/api/hrims/fetch-documents-by-institution',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            institutionId: selectedInstitution.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch documents');
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setProgress({
                  current: data.current,
                  total: data.total,
                  employee: data.employee,
                  status: data.status,
                  summary: data.summary,
                });
              } else if (data.type === 'complete') {
                setResults(data);
                toast({
                  title: 'Success',
                  description: `Processed ${data.summary.total} employees. ${data.summary.successful} successful.`,
                });
              }
            }
          }
        }
      } else {
        // Handle regular JSON response (for backward compatibility)
        const data = await response.json();
        if (data.success) {
          setResults(data);
          toast({
            title: 'Success',
            description: `Processed ${data.summary.total} employees. ${data.summary.successful} successful.`,
          });
        } else {
          throw new Error(data.message || 'Failed to fetch documents');
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching documents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  if (isFetchingInstitutions) {
    return (
      <div>
        <PageHeader
          title="Fetch Employee Documents from HRIMS"
          description="Loading..."
        />
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Fetch Employee Documents from HRIMS"
        description="Bulk fetch and store employee documents and certificates from HRIMS by institution"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Institution Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Select Institution
            </CardTitle>
            <CardDescription>
              Choose an institution to fetch employee documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">Search Institutions</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, vote number, or TIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institution</TableHead>
                      <TableHead>Vote Code</TableHead>
                      <TableHead>TIN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInstitutions.length > 0 ? (
                      paginatedInstitutions.map((inst) => (
                        <TableRow
                          key={inst.id}
                          className={`cursor-pointer ${selectedInstitution?.id === inst.id ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedInstitution(inst)}
                        >
                          <TableCell className="font-medium">
                            {inst.name}
                          </TableCell>
                          <TableCell>{inst.voteNumber || 'N/A'}</TableCell>
                          <TableCell>{inst.tinNumber || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground"
                        >
                          No institutions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalInstitutionPages}
                onPageChange={setCurrentPage}
                totalItems={filteredInstitutions.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fetch Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fetch Configuration
            </CardTitle>
            <CardDescription>Configure document fetch settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedInstitution ? (
                <>
                  <div className="bg-secondary/20 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">
                      Selected Institution:
                    </p>
                    <p className="text-lg font-bold">
                      {selectedInstitution.name}
                    </p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>
                        Vote Code: {selectedInstitution.voteNumber || 'N/A'}
                      </p>
                      <p>TIN: {selectedInstitution.tinNumber || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>How it works:</strong>
                      <br />
                      This will fetch documents and certificates from HRIMS for
                      all employees in this institution. Documents include CV,
                      confirmation letter, job contract, and birth certificate.
                      All files will be stored in MinIO storage.
                    </p>
                  </div>

                  <Button
                    onClick={handleFetchDocuments}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching Documents...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Fetch Employee Documents
                      </>
                    )}
                  </Button>

                  {/* Progress Display */}
                  {isLoading && progress && (
                    <div className="space-y-3 mt-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Processing {progress.total} employees. Please do not
                          close this page.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {progress.employee
                              ? `Processing: ${progress.employee}`
                              : 'Starting...'}
                          </span>
                          <span className="text-muted-foreground">
                            {progress.current} / {progress.total}
                          </span>
                        </div>
                        <Progress
                          value={(progress.current / progress.total) * 100}
                          className="h-2"
                        />
                        {progress.summary && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="text-green-600">
                              ✓ {progress.summary.successful} successful
                            </span>
                            {progress.summary.partial > 0 && (
                              <span className="text-yellow-600">
                                ⚠ {progress.summary.partial} partial
                              </span>
                            )}
                            {progress.summary.failed > 0 && (
                              <span className="text-red-600">
                                ✗ {progress.summary.failed} failed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isLoading && !progress && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Initializing document fetch. This may take several
                        minutes. Please do not close this page.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-10">
                  <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select an institution to begin</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results Summary</CardTitle>
            <CardDescription>
              Showing results for {selectedInstitution?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {results.summary.total}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Processed
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {results.summary.successful}
                </div>
                <div className="text-sm text-green-600">Successful</div>
              </div>
              <div className="p-4 border rounded-lg bg-yellow-50">
                <div className="text-2xl font-bold text-yellow-600">
                  {results.summary.partial}
                </div>
                <div className="text-sm text-yellow-600">Partial</div>
              </div>
              <div className="p-4 border rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">
                  {results.summary.failed}
                </div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h3 className="font-semibold">Detailed Results</h3>
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : result.status === 'partial'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : result.status === 'partial' ? (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          {result.employeeName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({result.payrollNumber})
                        </span>
                      </div>

                      {Object.keys(result.documentsStored).length > 0 && (
                        <div className="mt-2 ml-6 text-sm">
                          <div className="font-medium">Documents:</div>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {result.documentsStored.ardhilHali && (
                              <li>Ardhil Hali</li>
                            )}
                            {result.documentsStored.confirmationLetter && (
                              <li>Confirmation Letter</li>
                            )}
                            {result.documentsStored.jobContract && (
                              <li>Job Contract</li>
                            )}
                            {result.documentsStored.birthCertificate && (
                              <li>Birth Certificate</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {result.certificatesStored.length > 0 && (
                        <div className="mt-2 ml-6 text-sm">
                          <div className="font-medium">Certificates:</div>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {result.certificatesStored.map((cert, idx) => (
                              <li key={idx}>{cert.type}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.message && (
                        <div className="mt-1 ml-6 text-sm text-muted-foreground">
                          {result.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

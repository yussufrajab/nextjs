'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInstitutions, setIsFetchingInstitutions] = useState(true);
  const [results, setResults] = useState<FetchResponse | null>(null);

  // Fetch institutions on mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch('/api/institutions');
        if (response.ok) {
          const data = await response.json();
          setInstitutions(data);
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

    try {
      const response = await fetch('/api/hrims/fetch-documents-by-institution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institutionId: selectedInstitution.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults(data);
        toast({
          title: 'Success',
          description: `Processed ${data.summary.total} employees. ${data.summary.successful} successful.`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch documents',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while fetching documents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Fetch Employee Documents"
        description="Fetch and store employee documents and certificates from HRIMS to MinIO storage"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Institution</CardTitle>
          <CardDescription>
            Choose an institution to fetch documents for all employees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            {isFetchingInstitutions ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading institutions...</span>
              </div>
            ) : (
              <Select
                value={selectedInstitution?.id}
                onValueChange={(value) => {
                  const institution = institutions.find((i) => i.id === value);
                  setSelectedInstitution(institution || null);
                }}
              >
                <SelectTrigger id="institution">
                  <SelectValue placeholder="Select an institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name}
                      {institution.voteNumber && ` (Vote: ${institution.voteNumber})`}
                      {institution.tinNumber && ` (TIN: ${institution.tinNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={handleFetchDocuments}
            disabled={!selectedInstitution || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Documents...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Fetch Documents
              </>
            )}
          </Button>

          {isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This may take several minutes depending on the number of employees.
                Please do not close this page.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
                <div className="text-2xl font-bold">{results.summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
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
                        <span className="font-medium">{result.employeeName}</span>
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

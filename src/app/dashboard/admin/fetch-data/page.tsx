'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Building, Users, Database, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';

export interface Institution {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  voteNumber?: string;
  tinNumber?: string;
}

export interface EmployeeFetchResult {
  zanId: string;
  name: string;
  payrollNumber?: string;
  cadre?: string;
  status?: string;
  ministry?: string;
}

const employeeSearchSchema = z.object({
  zanId: z.string().optional(),
  payrollNumber: z.string().optional(),
}).refine(data => data.zanId || data.payrollNumber, {
  message: "Either ZanID or Payroll Number must be provided",
});

type EmployeeSearchFormValues = z.infer<typeof employeeSearchSchema>;

export default function FetchDataPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [fetchResults, setFetchResults] = useState<EmployeeFetchResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [identifierType, setIdentifierType] = useState<'votecode' | 'tin'>('votecode');
  const [hrimsPageSize, setHrimsPageSize] = useState(100);
  const [progress, setProgress] = useState<{
    phase: 'fetching' | 'saving';
    message: string;
    currentPage?: number;
    totalFetched?: number;
    estimatedTotal?: number;
    saved?: number;
    skipped?: number;
    total?: number;
    progressPercent?: number;
  } | null>(null);

  const itemsPerPage = 10;

  const form = useForm<EmployeeSearchFormValues>({
    resolver: zodResolver(employeeSearchSchema),
    defaultValues: {
      zanId: '',
      payrollNumber: '',
    },
  });

  // Load institutions
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const response = await fetch('/api/institutions');
        if (!response.ok) throw new Error('Failed to fetch institutions');
        const data = await response.json();
        setInstitutions(data.data || []);
        setFilteredInstitutions(data.data || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load institutions",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInstitutions();
  }, []);

  // Filter institutions based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredInstitutions(institutions);
    } else {
      const filtered = institutions.filter(inst =>
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.voteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.tinNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.phoneNumber?.includes(searchTerm)
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

  const totalInstitutionPages = Math.ceil(filteredInstitutions.length / itemsPerPage);

  const handleFetchEmployeeData = async (values: EmployeeSearchFormValues) => {
    if (!selectedInstitution?.voteNumber) {
      toast({
        title: "Error",
        description: "Institution vote number is required",
        variant: "destructive"
      });
      return;
    }

    setIsFetching(true);
    try {
      const response = await fetch('/api/hrims/fetch-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          institutionVoteNumber: selectedInstitution.voteNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch employee data');
      }

      const result = await response.json();

      if (result.success) {
        setFetchResults([result.data.Employee]);

        const successParts = ['Employee data fetched and stored successfully.'];
        if (result.data.photo) {
          successParts.push('Photo stored in MinIO.');
        }
        if (result.data.documents > 0) {
          successParts.push(`${result.data.documents} document(s) stored in MinIO.`);
        }

        toast({
          title: "Success",
          description: successParts.join(' '),
        });
        form.reset();
        setIsEmployeeDialogOpen(false);
      } else {
        throw new Error(result.message || 'Failed to fetch employee data');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch employee data",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleFetchByInstitution = async () => {
    // Validate based on selected identifier type
    if (identifierType === 'votecode' && !selectedInstitution?.voteNumber) {
      toast({
        title: "Error",
        description: "Institution must have a vote number to use this option",
        variant: "destructive"
      });
      return;
    }

    if (identifierType === 'tin' && !selectedInstitution?.tinNumber) {
      toast({
        title: "Error",
        description: "Institution must have a TIN number to use this option",
        variant: "destructive"
      });
      return;
    }

    setIsFetching(true);
    setProgress(null);
    setFetchResults([]);

    try {
      const response = await fetch('/api/hrims/fetch-by-institution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifierType,
          voteNumber: selectedInstitution.voteNumber,
          tinNumber: selectedInstitution.tinNumber,
          institutionId: selectedInstitution.id,
          pageSize: hrimsPageSize,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch employees by institution');
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
                  phase: data.phase,
                  message: data.message,
                  currentPage: data.currentPage,
                  totalFetched: data.totalFetched,
                  estimatedTotal: data.estimatedTotal,
                  saved: data.saved,
                  skipped: data.skipped,
                  total: data.total,
                  progressPercent: data.progressPercent,
                });
              } else if (data.type === 'complete') {
                const result = data;
                toast({
                  title: "Fetch Successful",
                  description: `Fetched ${result.data.employeeCount} employees from ${selectedInstitution.name} using ${result.data.usedIdentifier}. Pages: ${result.data.pagesFetched}, Total: ${result.data.totalFetched}${result.data.skippedCount > 0 ? `, Skipped: ${result.data.skippedCount}` : ''}.`,
                });

                if (result.data.employeeCount > 0) {
                  setFetchResults(result.data.employees || []);
                }
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            }
          }
        }
      } else {
        // Handle regular JSON response (for backward compatibility)
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Fetch Successful",
            description: `Fetched ${result.data.employeeCount} employees from ${selectedInstitution.name}`,
          });

          if (result.data.employeeCount > 0) {
            setFetchResults(result.data.employees || []);
          }
        } else {
          throw new Error(result.message || 'Failed to fetch employees');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch employees by institution",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
      setProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Fetch Data from HRIMS" description="Loading..." />
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Fetch Data from HRIMS"
        description="Fetch employee data from the external HRIMS system and store it in the local database."
      />

      {/* Institution Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Select Institution
          </CardTitle>
          <CardDescription>
            Choose an institution to fetch employee data from HRIMS. Search by name, vote number, TIN number, email, or phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search">Search Institutions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name, vote number, TIN, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Vote Number</TableHead>
                <TableHead>TIN Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInstitutions.length > 0 ? (
                paginatedInstitutions.map(inst => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell>{inst.voteNumber || 'N/A'}</TableCell>
                    <TableCell>{inst.tinNumber || 'N/A'}</TableCell>
                    <TableCell>{inst.email || 'N/A'}</TableCell>
                    <TableCell>{inst.phoneNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => setSelectedInstitution(inst)}
                        disabled={selectedInstitution?.id === inst.id}
                      >
                        {selectedInstitution?.id === inst.id ? 'Selected' : 'Select'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No institutions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalInstitutionPages}
            onPageChange={setCurrentPage}
            totalItems={filteredInstitutions.length}
            itemsPerPage={itemsPerPage}
          />
        </CardContent>
      </Card>

      {/* Selected Institution & Actions */}
      {selectedInstitution && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Fetch Operations for {selectedInstitution.name}
            </CardTitle>
            <CardDescription>
              <div className="space-y-1">
                <p>Vote Number: {selectedInstitution.voteNumber || 'N/A'}</p>
                <p>TIN Number: {selectedInstitution.tinNumber || 'N/A'}</p>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Identifier Type Selector */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <Label className="text-base font-semibold mb-3 block">Select Identifier Type for Institution Fetch</Label>
              <RadioGroup value={identifierType} onValueChange={(value) => setIdentifierType(value as 'votecode' | 'tin')}>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="votecode" id="votecode" />
                    <Label htmlFor="votecode" className="cursor-pointer font-normal">
                      Vote Code {selectedInstitution.voteNumber ? `(${selectedInstitution.voteNumber})` : '(Not Available)'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tin" id="tin" />
                    <Label htmlFor="tin" className="cursor-pointer font-normal">
                      TIN Number {selectedInstitution.tinNumber ? `(${selectedInstitution.tinNumber})` : '(Not Available)'}
                    </Label>
                  </div>
                </div>
              </RadioGroup>
              <p className="text-xs text-gray-600 mt-2">
                Choose which identifier to use when fetching employees from HRIMS for this institution.
              </p>
            </div>

            {/* Page Size Selector */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <Label htmlFor="hrimsPageSize" className="text-base font-semibold mb-2 block">HRIMS Pagination Settings</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="hrimsPageSize" className="text-sm mb-1 block">Records per Page</Label>
                  <Input
                    id="hrimsPageSize"
                    type="number"
                    min="10"
                    max="500"
                    value={hrimsPageSize}
                    onChange={(e) => setHrimsPageSize(parseInt(e.target.value) || 100)}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-gray-600 flex-1">
                  Number of records to fetch per page from HRIMS. The system will automatically fetch all pages. Lower values are more reliable for large datasets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setIsEmployeeDialogOpen(true)}
                disabled={isFetching}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Fetch Single Employee
              </Button>

              <Button
                onClick={handleFetchByInstitution}
                disabled={isFetching || (identifierType === 'votecode' && !selectedInstitution.voteNumber) || (identifierType === 'tin' && !selectedInstitution.tinNumber)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Building className="h-4 w-4" />
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Fetch by {identifierType === 'votecode' ? 'Vote Code' : 'TIN'}
              </Button>
            </div>

            {/* Progress Display */}
            {isFetching && progress && (
              <div className="space-y-3 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {progress.phase === 'fetching' ? 'Fetching employees from HRIMS...' : 'Saving employees to database...'}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{progress.message}</span>
                    {progress.phase === 'fetching' && progress.totalFetched !== undefined && progress.estimatedTotal !== undefined && (
                      <span className="text-muted-foreground">
                        {progress.totalFetched} / {progress.estimatedTotal}
                      </span>
                    )}
                    {progress.phase === 'saving' && progress.saved !== undefined && progress.total !== undefined && (
                      <span className="text-muted-foreground">
                        {progress.saved + (progress.skipped || 0)} / {progress.total}
                      </span>
                    )}
                  </div>

                  {progress.progressPercent !== undefined && (
                    <Progress value={progress.progressPercent} className="h-2" />
                  )}

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {progress.phase === 'fetching' && (
                      <>
                        {progress.currentPage !== undefined && (
                          <span>Page: {progress.currentPage}</span>
                        )}
                        {progress.totalFetched !== undefined && (
                          <span className="text-blue-600">Fetched: {progress.totalFetched}</span>
                        )}
                      </>
                    )}
                    {progress.phase === 'saving' && (
                      <>
                        {progress.saved !== undefined && (
                          <span className="text-green-600">✓ {progress.saved} saved</span>
                        )}
                        {progress.skipped !== undefined && progress.skipped > 0 && (
                          <span className="text-yellow-600">⊘ {progress.skipped} skipped</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isFetching && !progress && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Initializing data fetch. This may take several minutes for large institutions.
                  Please do not close this page.
                </AlertDescription>
              </Alert>
            )}

            {fetchResults.length > 0 && (
              <div className="border rounded-lg p-4 bg-green-50">
                <h4 className="font-medium text-green-800 mb-2">
                  {fetchResults.length === 1 ? 'Fetched Employee' : `Sample of Fetched Employees (showing first ${fetchResults.length})`}
                </h4>
                <div className="space-y-2">
                  {fetchResults.map((employee, index) => (
                    <div key={index} className="text-sm text-green-700 border-b border-green-200 pb-2 last:border-0">
                      <p><strong>{employee.name}</strong></p>
                      <p>ZanID: {employee.zanId}</p>
                      {employee.payrollNumber && <p>Payroll Number: {employee.payrollNumber}</p>}
                      {employee.cadre && <p>Cadre: {employee.cadre}</p>}
                      {employee.ministry && <p>Ministry: {employee.ministry}</p>}
                      <p>Status: {employee.status}</p>
                    </div>
                  ))}
                </div>
                {fetchResults.length > 1 && (
                  <p className="text-xs text-green-600 mt-3 italic">
                    This is a preview of the first few employees. Check the success notification for the total count.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Employee Search Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fetch Single Employee Data</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFetchEmployeeData)} className="space-y-4">
              <FormField
                control={form.control}
                name="zanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZanID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter ZanID..."
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payrollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payroll Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Payroll Number..."
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-sm text-gray-600">
                Note: Provide either ZanID or Payroll Number (or both)
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isFetching}>
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Fetch Employee Data
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
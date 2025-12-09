'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Building, Image, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';

export interface Institution {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  voteNumber?: string;
  tinNumber?: string;
}

export interface PhotoFetchResult {
  employeeName: string;
  payrollNumber: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
}

export default function GetPhotoPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchResults, setFetchResults] = useState<PhotoFetchResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    skipped: number;
  } | null>(null);

  const itemsPerPage = 10;

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

  const handleFetchPhotosByInstitution = async () => {
    if (!selectedInstitution) {
      toast({
        title: "Error",
        description: "Please select an institution",
        variant: "destructive"
      });
      return;
    }

    setIsFetching(true);
    setFetchResults([]);
    setSummary(null);

    try {
      toast({
        title: "Fetching Photos",
        description: `Starting to fetch employee photos from ${selectedInstitution.name}. This may take several minutes...`,
      });

      const response = await fetch('/api/hrims/fetch-photos-by-institution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institutionId: selectedInstitution.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch photos');
      }

      const result = await response.json();

      if (result.success) {
        setFetchResults(result.data.results || []);
        setSummary(result.data.summary);

        toast({
          title: "Photo Fetch Complete",
          description: `Processed ${result.data.summary.total} employees. Success: ${result.data.summary.success}, Failed: ${result.data.summary.failed}, Skipped: ${result.data.summary.skipped}`,
        });
      } else {
        throw new Error(result.message || 'Failed to fetch photos');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch photos",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Fetch Employee Photos from HRIMS" description="Loading..." />
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
        title="Fetch Employee Photos from HRIMS"
        description="Bulk fetch and store employee photos from HRIMS by institution"
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
              Choose an institution to fetch employee photos
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
                          <TableCell className="font-medium">{inst.name}</TableCell>
                          <TableCell>{inst.voteNumber || 'N/A'}</TableCell>
                          <TableCell>{inst.tinNumber || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
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
              <Camera className="h-5 w-5" />
              Fetch Configuration
            </CardTitle>
            <CardDescription>
              Configure photo fetch settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedInstitution ? (
                <>
                  <div className="bg-secondary/20 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-1">Selected Institution:</p>
                    <p className="text-lg font-bold">{selectedInstitution.name}</p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Vote Code: {selectedInstitution.voteNumber || 'N/A'}</p>
                      <p>TIN: {selectedInstitution.tinNumber || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>How it works:</strong><br/>
                      This will fetch photos from HRIMS for all employees in this institution that are stored in your database.
                      Each employee photo will be fetched individually using their payroll number.
                    </p>
                  </div>

                  <Button
                    onClick={handleFetchPhotosByInstitution}
                    disabled={isFetching}
                    className="w-full"
                    size="lg"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching Photos...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Fetch Employee Photos
                      </>
                    )}
                  </Button>
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

      {/* Results Summary */}
      {summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fetch Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
              <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.success}</p>
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
              <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.skipped}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {fetchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photo Fetch Results</CardTitle>
            <CardDescription>
              Detailed results for each employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Payroll Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetchResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.employeeName}</TableCell>
                      <TableCell>{result.payrollNumber}</TableCell>
                      <TableCell>
                        {result.status === 'success' && (
                          <Badge className="bg-green-600">Success</Badge>
                        )}
                        {result.status === 'failed' && (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                        {result.status === 'skipped' && (
                          <Badge variant="secondary">Skipped</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

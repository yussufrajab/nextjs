
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, INSTITUTIONS } from '@/lib/constants';
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, Eye, CalendarDays, Filter, Building, ListFilter as StatusFilterIcon, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isValid, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { Role as UserRoleType } from '@/lib/types';
import { Pagination } from '@/components/shared/pagination';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';


// Augment jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface TrackedRequest {
  id: string;
  employeeName: string;
  zanId: string;
  requestType: string;
  submissionDate: string;
  status: string;
  lastUpdatedDate: string;
  currentStage: string;
  employeeInstitution?: string;
  gender?: 'Male' | 'Female' | 'N/A';
  rejectionReason?: string | null;
}

const ALL_INSTITUTIONS_FILTER_VALUE = "__ALL_INSTITUTIONS__";
const ALL_STATUSES_FILTER_VALUE = "__ALL_STATUSES__";

export default function TrackStatusPage() {
  const { user, role } = useAuth();
  const [zanIdInput, setZanIdInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [allRequests, setAllRequests] = useState<TrackedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TrackedRequest[]>([]);
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [zanIdFilter, setZanIdFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availableInstitutions, setAvailableInstitutions] = useState<string[]>([]);
  const [requestStatuses, setRequestStatuses] = useState<string[]>([]);
  
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<TrackedRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isTableView = role === ROLES.HRO || role === ROLES.CSCS || role === ROLES.HRRP || role === ROLES.HHRMD || role === ROLES.HRMO || role === ROLES.DO;

  const fetchRequests = useCallback(async (params: URLSearchParams = new URLSearchParams()) => {
    setIsSearching(true);
    try {
        const response = await fetch(`/api/requests/track?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        const result = await response.json();
        const data: TrackedRequest[] = Array.isArray(result) ? result : (result.data || []);

        if (isTableView) {
            setAllRequests(data);
            setFilteredRequests(data);
            const statuses = Array.from(new Set(data.map(req => req.status))).sort();
            setRequestStatuses(statuses);
            const institutions = Array.from(new Set(data.map(req => req.employeeInstitution).filter(Boolean) as string[]));
            setAvailableInstitutions(institutions.sort());
        } else {
             setFilteredRequests(data);
             if (data.length === 0 && searchAttempted) {
                toast({ title: "No Requests Found", description: `No requests found for ZanID: ${params.get('zanId')}.` });
             } else if (searchAttempted) {
                toast({ title: "Requests Found", description: `Displaying requests for ZanID: ${params.get('zanId')}.` });
             }
        }
        setSearchAttempted(true);

    } catch (error) {
        toast({ title: "Error", description: "Could not load requests.", variant: "destructive" });
    } finally {
        setIsSearching(false);
    }
  }, [isTableView, searchAttempted]);
  
  useEffect(() => {
    if (isTableView) {
      let params = new URLSearchParams();
      if (role === ROLES.HRO && user?.institution?.name) {
          params.append('institutionName', user.institution.name);
          setInstitutionFilter(user.institution.name);
      }
      fetchRequests(params);
    }
  }, [role, user, isTableView, fetchRequests]);


  const handleSearchRequests = () => {
    if (!zanIdInput.trim()) {
      toast({ title: "ZanID Required", description: "Please enter an employee's ZanID to search.", variant: "destructive" });
      return;
    }
    const params = new URLSearchParams({ zanId: zanIdInput.trim() });
    fetchRequests(params);
  };

  const handleFilterRequests = () => {
    const params = new URLSearchParams();
    if(fromDateFilter) params.append('fromDate', fromDateFilter);
    if(toDateFilter) params.append('toDate', toDateFilter);
    if(zanIdFilter.trim()) params.append('zanId', zanIdFilter.trim());
    if(institutionFilter && institutionFilter !== ALL_INSTITUTIONS_FILTER_VALUE) params.append('institutionName', institutionFilter);
    if(statusFilter && statusFilter !== ALL_STATUSES_FILTER_VALUE) params.append('status', statusFilter);
    
    if (role === ROLES.HRO && user?.institution?.name) {
      params.set('institutionName', user.institution.name);
    }
    
    fetchRequests(params);
  };

  const handleViewDetails = (request: TrackedRequest) => {
    setSelectedRequestDetails(request);
    setIsDetailsModalOpen(true);
  };
  
  const handleExport = (format: 'pdf' | 'excel') => {
    if (filteredRequests.length === 0) {
      toast({ title: "Export Error", description: "There is no data to export.", variant: "destructive" });
      return;
    }

    const headers = ["Request ID", "Employee Name", "ZanID", "Institution", "Gender", "Request Type", "Submission Date", "Status"];
    const dataKeys = ["id", "employeeName", "zanId", "employeeInstitution", "gender", "requestType", "submissionDate", "status"];
    const title = "Request Status Report";

    if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      const tableColumn = headers;
      const tableRows: any[][] = [];
      filteredRequests.forEach(item => {
        const rowData = dataKeys.map(key => (item as any)[key] !== undefined ? String((item as any)[key]) : '');
        tableRows.push(rowData);
      });
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
      });
      doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`);
      toast({ title: "PDF Exported", description: "Report exported to PDF successfully." });
    } else if (format === 'excel') {
      const wsData = [headers, ...filteredRequests.map(item => dataKeys.map(key => (item as any)[key] ?? ''))];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Requests");
      XLSX.writeFile(wb, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.xlsx`);
      toast({ title: "Excel Exported", description: "Report exported to Excel successfully." });
    }
  };


  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div>
      <PageHeader title="Track Request Status" description="Monitor the status of requests submitted to the Civil Service Commission." />
        <>
          <Card className="shadow-lg mb-6">
            <CardHeader>
              <CardTitle>{isTableView ? "All Submitted Requests" : "Search Employee Requests"}</CardTitle>
              <CardDescription>
                {isTableView
                  ? (role === ROLES.HRO ? "View all requests submitted within your institution. Use filters to refine the list." : "View and filter all submitted requests. Click on a request to see details.")
                  : "Enter an employee's ZanID to view the status of their submitted requests."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTableView ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="fromDateFilter" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary"/>From Date</Label>
                    <Input id="fromDateFilter" type="date" value={fromDateFilter} onChange={(e) => setFromDateFilter(e.target.value)} disabled={isSearching}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="toDateFilter" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary"/>To Date</Label>
                    <Input id="toDateFilter" type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} disabled={isSearching}/>
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor="zanIdFilter">ZanID</Label>
                    <Input id="zanIdFilter" placeholder="Filter by ZanID" value={zanIdFilter} onChange={(e) => setZanIdFilter(e.target.value)} disabled={isSearching}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="institutionFilter" className="flex items-center"><Building className="mr-2 h-4 w-4 text-primary"/>Institution</Label>
                    <Select value={institutionFilter} onValueChange={setInstitutionFilter} disabled={isSearching || role === ROLES.HRO}>
                        <SelectTrigger id="institutionFilter">
                            <SelectValue placeholder="Filter by Institution" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_INSTITUTIONS_FILTER_VALUE}>All Institutions</SelectItem>
                            {availableInstitutions.map(inst => (
                                <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="statusFilter" className="flex items-center"><StatusFilterIcon className="mr-2 h-4 w-4 text-primary"/>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isSearching}>
                        <SelectTrigger id="statusFilter">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_STATUSES_FILTER_VALUE}>All Statuses</SelectItem>
                            {requestStatuses.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleFilterRequests} disabled={isSearching} className="md:self-end lg:mt-0 mt-4">
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                    Filter Requests
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-2 space-y-2 sm:space-y-0">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="zanIdInput">Employee ZanID</Label>
                    <Input id="zanIdInput" placeholder="Enter ZanID" value={zanIdInput} onChange={(e) => setZanIdInput(e.target.value)} disabled={isSearching}/>
                  </div>
                  <Button onClick={handleSearchRequests} disabled={isSearching || !zanIdInput.trim()}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search Requests
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isSearching && (
            <div className="flex items-center justify-center mt-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading requests...</p>
            </div>
          )}

          {!isSearching && searchAttempted && (
            <Card className="shadow-lg">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>
                    {isTableView ? "Requests List" : `Request Status for ZanID: ${zanIdInput}`}
                    </CardTitle>
                    <CardDescription>
                    {isTableView && `Displaying ${filteredRequests.length} matching requests.`}
                    </CardDescription>
                </div>
                {filteredRequests.length > 0 && (
                    <div className="flex space-x-2 mt-4 md:mt-0">
                        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                            <FileDown className="mr-2 h-4 w-4" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                            <FileDown className="mr-2 h-4 w-4" /> Excel
                        </Button>
                    </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredRequests.length > 0 ? (
                  <>
                  <Table>
                    <TableCaption>
                      {isTableView ? "Overview of submitted requests." : `A list of recent requests for ZanID: ${zanIdInput}.`}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>ZanID</TableHead>
                        {isTableView && <TableHead>Institution</TableHead>}
                        <TableHead>Gender</TableHead>
                        <TableHead>Request Type</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.map((request) => (
                        <TableRow key={request.id} onClick={() => handleViewDetails(request)} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{request.id}</TableCell>
                          <TableCell>{request.employeeName}</TableCell>
                          <TableCell>{request.zanId}</TableCell>
                          {isTableView && <TableCell>{request.employeeInstitution || 'N/A'}</TableCell>}
                          <TableCell>{request.gender}</TableCell>
                          <TableCell>{request.requestType}</TableCell>
                          <TableCell>{format(parseISO(request.submissionDate), 'PPP')}</TableCell>
                          <TableCell>{request.status}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(request); }}>
                              <Eye className="mr-1 h-3 w-3" /> Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                  />
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    {isTableView ? "No requests match the current filter criteria." : `No requests found for ZanID: ${zanIdInput}.`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!isTableView && !isSearching && !searchAttempted && (
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">Please enter an employee's ZanID above and click "Search Requests" to view their request history.</p>
              </CardContent>
            </Card>
          )}
        </>

      {selectedRequestDetails && isDetailsModalOpen && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Details: {selectedRequestDetails.id}</DialogTitle>
              <DialogDescription>
                <strong>Employee:</strong> {selectedRequestDetails.employeeName} (ZanID: {selectedRequestDetails.zanId}) <br />
                <strong>Institution:</strong> {selectedRequestDetails.employeeInstitution || 'N/A'} <br />
                <strong>Request Type:</strong> {selectedRequestDetails.requestType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><Label className="font-semibold">Submission Date:</Label> <p>{format(parseISO(selectedRequestDetails.submissionDate), 'PPP p')}</p></div>
                <div><Label className="font-semibold">Last Updated:</Label> <p>{format(parseISO(selectedRequestDetails.lastUpdatedDate), 'PPP p')}</p></div>
                <div><Label className="font-semibold">Current Status:</Label> <p className="text-primary">{selectedRequestDetails.status}</p></div>
                <div><Label className="font-semibold">Current Stage:</Label> <p>{selectedRequestDetails.currentStage}</p></div>
                {selectedRequestDetails.rejectionReason && (
                  <div className="col-span-2"><Label className="font-semibold">Rejection Reason:</Label> <p className="text-red-500">{selectedRequestDetails.rejectionReason}</p></div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

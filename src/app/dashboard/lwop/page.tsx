
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/ui/file-upload';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, AlertTriangle, CheckSquare, Eye, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Pagination } from '@/components/shared/pagination';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

interface LWOPRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  duration: string;
  reason: string;
  documents: string[];
}


function parseDurationToMonths(durationStr: string): number | null {
  durationStr = durationStr.toLowerCase().trim();

  const monthsMatch = durationStr.match(/^(\d+)\s*months?$/);
  if (monthsMatch && monthsMatch[1]) {
    return parseInt(monthsMatch[1], 10);
  }

  const yearsMatch = durationStr.match(/^(\d+)\s*years?$/);
  if (yearsMatch && yearsMatch[1]) {
    return parseInt(yearsMatch[1], 10) * 12;
  }
  
  const numberMatch = durationStr.match(/^(\d+)$/);
  if (numberMatch && numberMatch[1]) {
    return parseInt(numberMatch[1], 10);
  }

  return null; 
}


export default function LwopPage() {
  const { role, user } = useAuth();
  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [letterOfRequestKey, setLetterOfRequestKey] = useState<string>('');
  const [employeeConsentLetterKey, setEmployeeConsentLetterKey] = useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<LWOPRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LWOPRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<LWOPRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<LWOPRequest | null>(null);
  const [correctedStartDate, setCorrectedStartDate] = useState('');
  const [correctedEndDate, setCorrectedEndDate] = useState('');
  const [correctedDuration, setCorrectedDuration] = useState('');
  const [correctedReason, setCorrectedReason] = useState('');
  const [correctedLetterOfRequestKey, setCorrectedLetterOfRequestKey] = useState<string>('');
  const [correctedEmployeeConsentLetterKey, setCorrectedEmployeeConsentLetterKey] = useState<string>('');
  
  const [previewFileKey, setPreviewFileKey] = useState<string>('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const isEmployeeOnProbation = employeeDetails?.status === 'On Probation';
  
  // Calculate duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start < end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.ceil(diffDays / 30);
        
        const durationStr = diffMonths === 1 ? '1 month' : `${diffMonths} months`;
        setDuration(durationStr);
      } else {
        setDuration('');
      }
    } else {
      setDuration('');
    }
  }, [startDate, endDate]);
  
  const fetchRequests = async () => {
    if (!user || !role) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lwop?userId=${user.id}&userRole=${role}&userInstitutionId=${user.institutionId || ''}`);
      if (!response.ok) throw new Error('Failed to fetch LWOP requests');
      const data = await response.json();
      console.log("[LWOP_FRONTEND] Data received from API:", data);
      const processedData = data.map((req: any) => ({
        ...req,
        createdAt: typeof req.createdAt === 'object' ? req.createdAt.toISOString() : req.createdAt,
        updatedAt: typeof req.updatedAt === 'object' ? req.updatedAt.toISOString() : req.updatedAt,
        // Keep submittedBy as an object, don't overwrite it
      }));
      setPendingRequests(processedData);
    } catch (error) {
      toast({ title: "Error", description: "Could not load LWOP requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, role]);

  const handleFetchEmployeeDetails = async () => {
    if (!zanId) {
      toast({ title: "ZanID Required", description: "Please enter an employee's ZanID.", variant: "destructive" });
      return;
    }
    
    // Trim whitespace and validate format
    const cleanZanId = zanId.trim();
    if (!/^\d+$/.test(cleanZanId) || cleanZanId.length === 0) {
      toast({ title: "Invalid ZanID Format", description: "ZanID must contain only digits.", variant: "destructive" });
      return;
    }
    
    setIsFetchingEmployee(true);
    setEmployeeDetails(null);
    setStartDate('');
    setEndDate('');
    setDuration('');
    setReason('');
    setLetterOfRequestKey('');
    setEmployeeConsentLetterKey('');

    try {
        console.log(`[LWOP] Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`[LWOP] Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[LWOP] API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        console.log(`[LWOP] Found employee: ${foundEmployee.name}`); // Debug log

        setEmployeeDetails(foundEmployee);
        toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded successfully.` });
    } catch (error: any) {
        console.error(`[LWOP] Search failed:`, error); // Debug log
        const errorMessage = error.message || `No employee found with ZanID: ${cleanZanId}.`;
        toast({ title: "Employee Not Found", description: errorMessage, variant: "destructive" });
    } finally {
        setIsFetchingEmployee(false);
    }
  };

  const handleResubmit = (request: LWOPRequest) => {
    setRequestToCorrect(request);
    setCorrectedDuration(request.duration || '');
    setCorrectedReason(request.reason || '');
    // Clear file inputs for new upload
    setCorrectedLetterOfRequestKey('');
    setCorrectedEmployeeConsentLetterKey('');
    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: LWOPRequest | null) => {
    if (!request || !user) return;

    // Validation for corrected fields
    if (!correctedDuration) {
      toast({ title: "Submission Error", description: "Duration is missing. Please fill in the duration.", variant: "destructive" });
      return;
    }
    if (!correctedReason) {
      toast({ title: "Submission Error", description: "Reason for LWOP is missing. Please fill in the reason.", variant: "destructive" });
      return;
    }

    const parsedMonths = parseDurationToMonths(correctedDuration);
    if (parsedMonths === null) {
      toast({ 
        title: "Invalid Duration Format", 
        description: "Please enter duration like '6 months', '1 year', or a number of months (e.g., '24').", 
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (parsedMonths > 36) {
      toast({ 
        title: "LWOP Duration Exceeded", 
        description: "Maximum LWOP duration is 36 months.", 
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    if (!correctedLetterOfRequestKey || !correctedEmployeeConsentLetterKey) {
        toast({ title: "Submission Error", description: "All required PDF documents must be attached.", variant: "destructive" });
        return;
    }

    try {
      // This is where you would handle the actual file upload to a storage service
      // For now, we'll just update the status and reason

      const response = await fetch(`/api/lwop`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRMO/HHRMD Review', // Both roles can review in parallel after correction
          reviewStage: 'initial',
          duration: correctedDuration, // Update duration
          reason: correctedReason,     // Update reason
          documents: [
            correctedLetterOfRequestKey,
            correctedEmployeeConsentLetterKey,
          ].filter(Boolean), // Filter out empty strings if no file is selected
          rejectionReason: null, // Clear rejection reason on resubmission
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resubmit LWOP request');
      }

      toast({ title: "Success", description: `LWOP request ${request.id} resubmitted.` });
      setIsCorrectionModalOpen(false);
      setRequestToCorrect(null);
      fetchRequests(); // Refresh the list of requests
    } catch (error) {
      console.error("[RESUBMIT_LWOP]", error);
      toast({ title: "Error", description: "Failed to resubmit LWOP request.", variant: "destructive" });
    }
  };

  const handleSubmitLwopRequest = async () => {
    if (!employeeDetails || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }

    if (employeeDetails.status === 'On Probation') {
      toast({ 
        title: "LWOP Not Applicable", 
        description: "This employee is currently 'On Probation' and cannot apply for LWOP.", 
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (!startDate) {
      toast({ title: "Submission Error", description: "Start date is missing. Please select a start date.", variant: "destructive" });
      return;
    }
    if (!endDate) {
      toast({ title: "Submission Error", description: "End date is missing. Please select an end date.", variant: "destructive" });
      return;
    }
    if (!reason) {
      toast({ title: "Submission Error", description: "Reason for LWOP is missing. Please fill in the reason.", variant: "destructive" });
      return;
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      toast({ 
        title: "Invalid Date Range", 
        description: "End date must be after start date.", 
        variant: "destructive"
      });
      return;
    }
    
    // Calculate duration in months
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.ceil(diffDays / 30);
    
    if (diffMonths > 36) {
      toast({ 
        title: "LWOP Duration Exceeded", 
        description: `Maximum LWOP duration is 36 months. Selected duration is ${diffMonths} months.`, 
        variant: "destructive"
      });
      return;
    }
    
    // Create duration string for display
    const durationStr = diffMonths === 1 ? '1 month' : `${diffMonths} months`;
    
    if (!letterOfRequestKey || !employeeConsentLetterKey) {
        toast({ title: "Submission Error", description: "All required PDF documents must be attached.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    const documentsList = [letterOfRequestKey, employeeConsentLetterKey];
    
    const payload = {
        employeeId: employeeDetails.id,
        submittedById: user.id,
        documents: documentsList,
        status: 'Pending HRMO/HHRMD Review', // Both roles can review in parallel
        startDate,
        endDate,
        duration: durationStr,
        reason,
    };

    try {
        const response = await fetch('/api/lwop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to submit request');
        
        await fetchRequests(); // Refresh list
        toast({ title: "LWOP Request Submitted", description: `Request for ${employeeDetails.name} submitted successfully.` });
        setZanId('');
        setEmployeeDetails(null);
        setStartDate('');
        setEndDate('');
        setDuration('');
        setReason('');
        setLetterOfRequestKey('');
        setEmployeeConsentLetterKey('');
    } catch(error) {
        toast({ title: "Submission Failed", description: "Could not submit the LWOP request.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleUpdateRequest = async (requestId: string, payload: any) => {
      try {
          const response = await fetch(`/api/lwop`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: requestId, ...payload, reviewedById: user?.id })
          });
          if (!response.ok) throw new Error('Failed to update request');
          await fetchRequests();
          return true;
      } catch (error) {
          toast({ title: "Update Failed", description: "Could not update the request.", variant: "destructive" });
          return false;
      }
  };

  const handleInitialAction = async (requestId: string, action: 'forward' | 'reject') => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;

    if (action === 'reject') {
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    } else if (action === 'forward') {
      // Both HRMO and HHRMD forward directly to Commission (parallel workflow)
      const payload = { status: "Request Received – Awaiting Commission Decision", reviewStage: 'commission_review' };
      
      const success = await handleUpdateRequest(requestId, payload);
      if (success) {
        const roleName = role === ROLES.HRMO ? 'HRMO' : 'HHRMD';
        toast({ title: "Request Forwarded", description: `Request for ${request.employee.name} approved by ${roleName} and forwarded to Commission.` });
      }
    }
  };

  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim() || !user) return;
    const payload = { 
        status: `Rejected by ${role} - Awaiting HRO Correction`, 
        rejectionReason: rejectionReasonInput, 
        reviewStage: 'initial'
    };
    const success = await handleUpdateRequest(currentRequestToAction.id, payload);
    if (success) {
      toast({ title: "Request Rejected", description: `Request for ${currentRequestToAction.employee.name} rejected.`, variant: 'destructive' });
      setIsRejectionModalOpen(false);
      setCurrentRequestToAction(null);
      setRejectionReasonInput('');
    }
  };

  const handleCommissionDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    const finalStatus = decision === 'approved' ? "Approved by Commission" : "Rejected by Commission - Request Concluded";
    const payload = { status: finalStatus, reviewStage: 'completed' };
    const success = await handleUpdateRequest(requestId, payload);
    if (success) {
        toast({ title: `Commission Decision: ${decision === 'approved' ? 'Approved' : 'Rejected'}`, description: `Request ${requestId} has been updated.` });
    }
  };

  const paginatedRequests = pendingRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <PageHeader title="Leave Without Pay (LWOP)" description="Manage LWOP requests." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit LWOP Request</CardTitle>
            <CardDescription>Enter employee's ZanID to fetch details, then complete the LWOP form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdLwop">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdLwop" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
                <Button onClick={handleFetchEmployeeDetails} disabled={isFetchingEmployee || !zanId || isSubmitting}>
                  {isFetchingEmployee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Fetch Details
                </Button>
              </div>
            </div>

            {employeeDetails && (
              <div className="space-y-6 pt-2">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-foreground">Employee Details</h3>
                  <div className="p-4 rounded-md border bg-secondary/20 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <div><Label className="text-muted-foreground">Name:</Label> <p className="font-semibold text-foreground">{employeeDetails.name}</p></div>
                      <div><Label className="text-muted-foreground">ZanID:</Label> <p className="font-semibold text-foreground">{employeeDetails.zanId}</p></div>
                      <div><Label className="text-muted-foreground">Payroll Number:</Label> <p className="font-semibold text-foreground">{employeeDetails.payrollNumber || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">ZSSF Number:</Label> <p className="font-semibold text-foreground">{employeeDetails.zssfNumber || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Department:</Label> <p className="font-semibold text-foreground">{employeeDetails.department || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Cadre/Position:</Label> <p className="font-semibold text-foreground">{employeeDetails.cadre || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeDetails.employmentDate ? format(parseISO(String(employeeDetails.employmentDate)), 'PPP') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeDetails.dateOfBirth ? format(parseISO(String(employeeDetails.dateOfBirth)), 'PPP') : 'N/A'}</p></div>
                      <div className="lg:col-span-1"><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{typeof employeeDetails.institution === 'object' && employeeDetails.institution !== null ? employeeDetails.institution.name : employeeDetails.institution || 'N/A'}</p></div>
                      <div className="md:col-span-2 lg:col-span-3"><Label className="text-muted-foreground">Current Status:</Label> <p className={`font-semibold ${isEmployeeOnProbation ? 'text-destructive' : 'text-green-600'}`}>{employeeDetails.status || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                {isEmployeeOnProbation && (
                  <div className="flex items-center p-4 mt-2 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>LWOP is not applicable for employees currently 'On Probation'.</span>
                  </div>
                )}
            
                <div className={`space-y-4 ${isEmployeeOnProbation ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-foreground">LWOP Details</h3>
                  <div>
                    <Label htmlFor="startDateLwop">Start Date</Label>
                    <Input id="startDateLwop" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isSubmitting || isEmployeeOnProbation} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label htmlFor="endDateLwop">End Date</Label>
                    <Input id="endDateLwop" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isSubmitting || isEmployeeOnProbation} min={startDate || new Date().toISOString().split('T')[0]} />
                  </div>
                  {duration && (
                    <div className="p-3 bg-secondary rounded-md">
                      <Label className="text-sm font-medium">Calculated Duration</Label>
                      <p className="text-lg font-semibold text-primary">{duration}</p>
                      {parseInt(duration.match(/\d+/)?.[0] || '0') > 36 && (
                        <p className="text-sm text-destructive mt-1">⚠️ Exceeds maximum allowed duration of 36 months</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="reasonLwop">Reason for LWOP</Label>
                    <Textarea id="reasonLwop" placeholder="State the reason for the leave request" value={reason} onChange={(e) => setReason(e.target.value)} disabled={isSubmitting || isEmployeeOnProbation} />
                  </div>
                  <FileUpload
                    label="Letter of Request"
                    description="Upload the official letter of request (PDF only)"
                    accept=".pdf"
                    value={letterOfRequestKey}
                    onChange={(value) => setLetterOfRequestKey(value as string)}
                    folder="lwop/letters"
                    disabled={isSubmitting || isEmployeeOnProbation}
                    required
                  />
                  <FileUpload
                    label="Employee's Consent Letter"
                    description="Upload the employee's consent letter (PDF only)"
                    accept=".pdf"
                    value={employeeConsentLetterKey}
                    onChange={(value) => setEmployeeConsentLetterKey(value as string)}
                    folder="lwop/consents"
                    disabled={isSubmitting || isEmployeeOnProbation}
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button onClick={handleSubmitLwopRequest} disabled={!employeeDetails || !startDate || !endDate || !reason || !letterOfRequestKey || !employeeConsentLetterKey || isSubmitting || isEmployeeOnProbation}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit LWOP Request
                </Button>
            </CardFooter>
          )}
        </Card>
      )}

       {(role === ROLES.HHRMD || role === ROLES.HRMO || role === ROLES.HRO) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Review LWOP Requests</CardTitle>
            <CardDescription>Review, approve, or reject pending LWOP requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">LWOP Request for: {request.employee?.name || 'N/A'} (ZanID: {request.employee?.zanId || 'N/A'})</h3>
                  <p className="text-sm text-muted-foreground">Duration: {request.duration}</p>
                  <p className="text-sm text-muted-foreground">Reason: {request.reason}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'} by {request.submittedBy?.name || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                    {/* HRMO/HHRMD Parallel Review Actions */}
                    {(role === ROLES.HRMO || role === ROLES.HHRMD) && (request.status === 'Pending HRMO/HHRMD Review') && (
                      <>
                        <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify &amp; Forward to Commission</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject &amp; Return to HRO</Button>
                      </>
                    )}
                    {(role === ROLES.HRMO || role === ROLES.HHRMD) && request.reviewStage === 'commission_review' && request.status === 'Request Received – Awaiting Commission Decision' && (
                        <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCommissionDecision(request.id, 'approved')}>Approved by Commission</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleCommissionDecision(request.id, 'rejected')}>Rejected by Commission</Button>
                        </>
                    )}

                    {role === ROLES.HRO && (request.status === 'Rejected by HHRMD - Awaiting HRO Correction' || request.status === 'Rejected by HRMO - Awaiting HRO Correction') && (
                      <Button size="sm" onClick={() => handleResubmit(request)}>Correct and Resubmit</Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No LWOP requests pending your review.</p>
            )}
             <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(pendingRequests.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={pendingRequests.length}
                itemsPerPage={itemsPerPage}
             />
          </CardContent>
        </Card>
      )}

      {selectedRequest && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                LWOP request for <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
              </DialogDescription>
            </DialogHeader>
             <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
                <div className="space-y-1 border-b pb-3 mb-3">
                    <h4 className="font-semibold text-base text-foreground mb-2">Employee Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Full Name:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.name}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">ZanID:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.zanId}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Payroll #:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.payrollNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">ZSSF #:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.zssfNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Department:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.department}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Cadre/Position:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.cadre}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Employment Date:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.employmentDate ? format(parseISO(selectedRequest.employee.employmentDate.toString()), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Date of Birth:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.dateOfBirth ? format(parseISO(selectedRequest.employee.dateOfBirth.toString()), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Institution:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.institution?.name || 'N/A'}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <h4 className="font-semibold text-base text-foreground mb-2">Request Information</h4>
                    {selectedRequest.startDate && (
                        <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold">Start Date:</Label>
                            <p className="col-span-2">{format(parseISO(selectedRequest.startDate), 'PPP')}</p>
                        </div>
                    )}
                    {selectedRequest.endDate && (
                        <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold">End Date:</Label>
                            <p className="col-span-2">{format(parseISO(selectedRequest.endDate), 'PPP')}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Duration:</Label>
                        <p className="col-span-2">{selectedRequest.duration}</p>
                    </div>
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold pt-1">Reason:</Label>
                        <p className="col-span-2">{selectedRequest.reason}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Submitted:</Label>
                        <p className="col-span-2">{selectedRequest.createdAt ? format(parseISO(selectedRequest.createdAt), 'PPP') : 'N/A'} by {selectedRequest.submittedBy.name}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Status:</Label>
                        <p className="col-span-2 text-primary">{selectedRequest.status}</p>
                    </div>
                    {selectedRequest.rejectionReason && (
                        <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold text-destructive pt-1">Rejection Reason:</Label>
                            <p className="col-span-2 text-destructive">{selectedRequest.rejectionReason}</p>
                        </div>
                    )}
                </div>
                 <div className="pt-3 mt-3 border-t">
                    <Label className="font-semibold">Attached Documents</Label>
                    <div className="mt-2 space-y-2">
                    {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                        selectedRequest.documents.map((doc, index) => {
                            const fileName = doc.split('/').pop() || doc;
                            const isLetterOfRequest = index === 0;
                            const documentType = isLetterOfRequest ? 'Letter of Request' : 'Employee Consent Letter';
                            
                            return (
                                <div key={index} className="flex items-center justify-between p-3 rounded-md border bg-secondary/50">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate" title={fileName}>
                                                {documentType}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate" title={fileName}>
                                                {fileName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 px-2"
                                            onClick={() => {
                                                setPreviewFileKey(doc);
                                                setIsPreviewModalOpen(true);
                                            }}
                                        >
                                            <Eye className="h-3 w-3 mr-1" />
                                            View
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 px-2"
                                            onClick={() => {
                                                // Create a temporary link for download with auth headers
                                                const token = localStorage.getItem('accessToken');
                                                if (token) {
                                                    fetch(`/api/files/download/${doc}`, {
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    })
                                                    .then(response => response.blob())
                                                    .then(blob => {
                                                        const url = window.URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = doc.split('/').pop() || 'download';
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        window.URL.revokeObjectURL(url);
                                                        document.body.removeChild(a);
                                                    });
                                                }
                                            }}
                                        >
                                            <Download className="h-3 w-3 mr-1" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-muted-foreground text-sm">No documents were attached to this request.</p>
                    )}
                    </div>
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

      {currentRequestToAction && (
        <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject LWOP Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the LWOP request for <strong>{currentRequestToAction.employee.name}</strong>. This reason will be visible to the HRO.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="Enter rejection reason here..."
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsRejectionModalOpen(false); setCurrentRequestToAction(null); setRejectionReasonInput(''); }}>Cancel</Button>
                    <Button variant="destructive" onClick={handleRejectionSubmit} disabled={!rejectionReasonInput.trim()}>Submit Rejection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    {/* Correction Modal */}
    <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Correct and Resubmit LWOP Request</DialogTitle>
          <DialogDescription>
            Update the details and re-upload documents for the LWOP request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration
            </Label>
            <Input
              id="duration"
              value={correctedDuration}
              onChange={(e) => setCorrectedDuration(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Textarea
              id="reason"
              value={correctedReason}
              onChange={(e) => setCorrectedReason(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="space-y-4">
            <FileUpload
              label="Letter of Request (PDF)"
              description="Upload the corrected letter of request"
              accept=".pdf"
              value={correctedLetterOfRequestKey}
              onChange={(value) => setCorrectedLetterOfRequestKey(value as string)}
              folder="lwop/letters"
              required
            />
            <FileUpload
              label="Employee's Consent Letter (PDF)"
              description="Upload the corrected consent letter"
              accept=".pdf"
              value={correctedEmployeeConsentLetterKey}
              onChange={(value) => setCorrectedEmployeeConsentLetterKey(value as string)}
              folder="lwop/consents"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCorrectionModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleConfirmResubmit(requestToCorrect)}>Confirm Resubmission</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* File Preview Modal */}
    <FilePreviewModal 
      open={isPreviewModalOpen}
      onOpenChange={(open) => {
        setIsPreviewModalOpen(open);
        if (!open) setPreviewFileKey('');
      }}
      objectKey={previewFileKey}
      title="Document Preview"
    />
    </div>
  );
}


'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, CalendarDays, CheckSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { useAuthStore } from '@/store/auth-store';

interface ServiceExtensionRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  createdAt: string;

  currentRetirementDate: string;
  requestedExtensionPeriod: string;
  justification: string;
  documents: string[];
}

export default function ServiceExtensionPage() {
  const { role, user } = useAuth();
  const { accessToken } = useAuthStore();
  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentRetirementDate, setCurrentRetirementDate] = useState('');
  const [requestedExtensionPeriod, setRequestedExtensionPeriod] = useState('');
  const [justification, setJustification] = useState('');
  const [employeeConsentLetterFile, setEmployeeConsentLetterFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<ServiceExtensionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceExtensionRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  // Handle file preview
  const handlePreviewFile = (objectKey: string) => {
    setPreviewObjectKey(objectKey);
    setIsPreviewModalOpen(true);
  };

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<ServiceExtensionRequest | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<ServiceExtensionRequest | null>(null);
  const [correctedCurrentRetirementDate, setCorrectedCurrentRetirementDate] = useState('');
  const [correctedRequestedExtensionPeriod, setCorrectedRequestedExtensionPeriod] = useState('');
  const [correctedJustification, setCorrectedJustification] = useState('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] = useState<string>('');
  const [correctedEmployeeConsentLetterFile, setCorrectedEmployeeConsentLetterFile] = useState<string>('');

  const fetchRequests = async () => {
    if (!user || !role) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/service-extension?userId=${user.id}&userRole=${role}&userInstitutionId=${user.institutionId || ''}`);
      if (!response.ok) throw new Error('Failed to fetch service extension requests');
      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      toast({ title: "Error", description: "Could not load service extension requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, role]);

  const resetFormFields = () => {
    setCurrentRetirementDate('');
    setRequestedExtensionPeriod('');
    setJustification('');
    setEmployeeConsentLetterFile('');
    setLetterOfRequestFile('');
  };

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
    resetFormFields();

    try {
        console.log(`[SERVICE_EXTENSION] Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`[SERVICE_EXTENSION] Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SERVICE_EXTENSION] API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        console.log(`[SERVICE_EXTENSION] Found employee: ${foundEmployee.name}`); // Debug log

        setEmployeeDetails(foundEmployee);
        toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded successfully.` });
    } catch (error: any) {
        console.error(`[SERVICE_EXTENSION] Error fetching employee:`, error); // Debug log
        toast({ 
            title: "Employee Not Found", 
            description: error.message || `No employee found with ZanID: ${cleanZanId}.`, 
            variant: "destructive" 
        });
    } finally {
        setIsFetchingEmployee(false);
    }
  };
  
  const handleUpdateRequest = async (requestId: string, payload: any) => {
    try {
        const response = await fetch(`/api/service-extension`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({id: requestId, ...payload, reviewedById: user?.id })
        });
        if (!response.ok) throw new Error('Failed to update request');
        await fetchRequests();
        return true;
    } catch (error) {
        toast({ title: "Update Failed", description: "Could not update the request.", variant: "destructive" });
        return false;
    }
  };

  const handleSubmitServiceExtensionRequest = async () => {
    if (!employeeDetails || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }
    if (!currentRetirementDate || !requestedExtensionPeriod || !justification || !letterOfRequestFile || !employeeConsentLetterFile) {
        toast({ title: "Submission Error", description: "Please fill all required fields and upload both required PDF documents.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    
    // Build the documents array with object keys
    const documentObjectKeys: string[] = [];
    if (letterOfRequestFile) documentObjectKeys.push(letterOfRequestFile);
    if (employeeConsentLetterFile) documentObjectKeys.push(employeeConsentLetterFile);
    
    const payload = {
        employeeId: employeeDetails.id,
        submittedById: user.id,
        status: 'Pending HRMO/HHRMD Review',
        currentRetirementDate: new Date(currentRetirementDate).toISOString(),
        requestedExtensionPeriod,
        justification,
        documents: documentObjectKeys
    };

    try {
      const response = await fetch('/api/service-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to submit request');
      
      await fetchRequests(); // Refresh the list
      toast({ title: "Service Extension Request Submitted", description: `Request for ${employeeDetails.name} submitted successfully.` });
      setZanId('');
      setEmployeeDetails(null);
      resetFormFields();
    } catch(error) {
      toast({ title: "Submission Failed", description: "Could not submit the service extension request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
      const payload = { status: "Request Received – Awaiting Commission Decision", reviewStage: 'commission_review' };
      const success = await handleUpdateRequest(requestId, payload);
      if (success) toast({ title: "Request Forwarded", description: `Request for ${request.employee.name} forwarded to Commission.` });
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

  const handleCorrection = (request: ServiceExtensionRequest) => {
    setRequestToCorrect(request);
    setCorrectedCurrentRetirementDate(request.currentRetirementDate ? format(parseISO(request.currentRetirementDate), 'yyyy-MM-dd') : '');
    setCorrectedRequestedExtensionPeriod(request.requestedExtensionPeriod || '');
    setCorrectedJustification(request.justification || '');
    setCorrectedLetterOfRequestFile('');
    setCorrectedEmployeeConsentLetterFile('');
    
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => (input as HTMLInputElement).value = '');
    
    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: ServiceExtensionRequest | null) => {
    if (!request || !user) {
      toast({ title: "Error", description: "Request or user details are missing.", variant: "destructive" });
      return;
    }

    if (!correctedCurrentRetirementDate || !correctedRequestedExtensionPeriod || !correctedJustification || correctedLetterOfRequestFile === '' || correctedEmployeeConsentLetterFile === '') {
      toast({ title: "Validation Error", description: "Please fill all required fields and upload required documents.", variant: "destructive" });
      return;
    }

    const correctedDocumentObjectKeys: string[] = [];
    if (correctedLetterOfRequestFile) correctedDocumentObjectKeys.push(correctedLetterOfRequestFile);
    if (correctedEmployeeConsentLetterFile) correctedDocumentObjectKeys.push(correctedEmployeeConsentLetterFile);

    try {
      const response = await fetch(`/api/service-extension`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRMO/HHRMD Review',
          reviewStage: 'initial',
          currentRetirementDate: new Date(correctedCurrentRetirementDate).toISOString(),
          requestedExtensionPeriod: correctedRequestedExtensionPeriod,
          justification: correctedJustification,
          documents: correctedDocumentObjectKeys,
          rejectionReason: null,
          reviewedById: user.id
        }),
      });

      if (!response.ok) throw new Error('Failed to update request');

      await fetchRequests();
      toast({ title: "Request Corrected", description: `Service extension request for ${request.employee.name} has been corrected and resubmitted.` });
      setIsCorrectionModalOpen(false);
      setRequestToCorrect(null);
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update the request.", variant: "destructive" });
    }
  };

  const paginatedRequests = pendingRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <div>
      <PageHeader title="Service Extension" description="Manage employee service extensions." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Service Extension Request</CardTitle>
            <CardDescription>Enter ZanID, then fill extension details and upload required PDF documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdServiceExt">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdServiceExt" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
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
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeDetails.employmentDate ? format(parseISO(employeeDetails.employmentDate), 'PPP') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeDetails.dateOfBirth ? format(parseISO(employeeDetails.dateOfBirth), 'PPP') : 'N/A'}</p></div>
                      <div className="lg:col-span-1"><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{typeof employeeDetails.institution === 'object' ? employeeDetails.institution?.name : employeeDetails.institution || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Service Extension Details &amp; Documents</h3>
                  <div>
                    <Label htmlFor="currentRetirementDate" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" />Current Retirement Date</Label>
                    <Input id="currentRetirementDate" type="date" value={currentRetirementDate} onChange={(e) => setCurrentRetirementDate(e.target.value)} disabled={isSubmitting} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label htmlFor="requestedExtensionPeriod">Requested Extension Period (e.g., 1 year, 6 months)</Label>
                    <Input id="requestedExtensionPeriod" placeholder="Specify duration of extension" value={requestedExtensionPeriod} onChange={(e) => setRequestedExtensionPeriod(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="justificationServiceExt">Justification for Extension</Label>
                    <Textarea id="justificationServiceExt" placeholder="Provide strong reasons for the service extension" value={justification} onChange={(e) => setJustification(e.target.value)} disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="letterOfRequestServiceExt" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request (Required, PDF Only)</Label>
                    <FileUpload
                      folder="service-extension"
                      value={letterOfRequestFile}
                      onChange={setLetterOfRequestFile}
                      onPreview={handlePreviewFile}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                   <div>
                    <Label htmlFor="employeeConsentLetterFile" className="flex items-center"><CheckSquare className="mr-2 h-4 w-4 text-primary" />Upload Employee Consent Letter (Required, PDF Only)</Label>
                    <FileUpload
                      folder="service-extension"
                      value={employeeConsentLetterFile}
                      onChange={setEmployeeConsentLetterFile}
                      onPreview={handlePreviewFile}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button 
                onClick={handleSubmitServiceExtensionRequest} 
                disabled={
                    !employeeDetails || 
                    !currentRetirementDate ||
                    !requestedExtensionPeriod ||
                    !justification ||
                    !letterOfRequestFile || 
                    !employeeConsentLetterFile ||
                    isSubmitting 
                }>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Your Submitted Service Extension Requests</CardTitle>
            <CardDescription>Track the status of service extension requests you have submitted.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">Service Extension for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Current Retirement: {request.currentRetirementDate ? format(parseISO(request.currentRetirementDate), 'PPP') : 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Extension Requested: {request.requestedExtensionPeriod}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                    {request.status.includes('Rejected') && request.status.includes('Awaiting HRO') && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleCorrection(request)}>
                        Correct & Resubmit
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No service extension requests found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {(role === ROLES.HHRMD || role === ROLES.HRMO) && ( 
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Review Service Extension Requests</CardTitle>
            <CardDescription>Review, approve, or reject pending service extension requests.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">Service Extension for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Current Retirement: {request.currentRetirementDate ? format(parseISO(request.currentRetirementDate), 'PPP') : 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Extension Requested: {request.requestedExtensionPeriod}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'} by {request.submittedBy.name}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                    {(role === ROLES.HRMO || role === ROLES.HHRMD) && (request.status === 'Pending HRMO/HHRMD Review') && (
                      <>
                        <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify &amp; Forward to Commission</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject &amp; Return to HRO</Button>
                      </>
                    )}
                    {request.reviewStage === 'commission_review' && request.status === 'Request Received – Awaiting Commission Decision' && (
                        <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCommissionDecision(request.id, 'approved')}>Approved by Commission</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleCommissionDecision(request.id, 'rejected')}>Rejected by Commission</Button>
                        </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No service extension requests pending your review.</p>
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
                Service Extension request for <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
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
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.employmentDate ? format(parseISO(selectedRequest.employee.employmentDate), 'PPP') : 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Date of Birth:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.dateOfBirth ? format(parseISO(selectedRequest.employee.dateOfBirth), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Institution:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.institution?.name || 'N/A'}</p>
                    </div>
                </div>
                 <div className="space-y-1">
                    <h4 className="font-semibold text-base text-foreground mb-2">Request Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Current Retirement:</Label>
                        <p className="col-span-2">{selectedRequest.currentRetirementDate ? format(parseISO(selectedRequest.currentRetirementDate), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Extension Period:</Label>
                        <p className="col-span-2">{selectedRequest.requestedExtensionPeriod}</p>
                    </div>
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold pt-1">Justification:</Label>
                        <p className="col-span-2">{selectedRequest.justification}</p>
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
                        selectedRequest.documents.map((objectKey, index) => {
                          const fileName = objectKey.split('/').pop() || objectKey;
                          return (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground truncate" title={fileName}>{fileName}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewFile(objectKey)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const headers: HeadersInit = {};
                                        if (accessToken) {
                                          headers['Authorization'] = `Bearer ${accessToken}`;
                                        }
                                        
                                        const response = await fetch(`/api/files/download/${objectKey}`, {
                                          credentials: 'include',
                                          headers
                                        });
                                        if (response.ok) {
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = fileName;
                                          document.body.appendChild(a);
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          document.body.removeChild(a);
                                        } else {
                                          toast({
                                            title: 'Download Failed',
                                            description: 'Could not download the file. Please try again.',
                                            variant: 'destructive'
                                          });
                                        }
                                      } catch (error) {
                                        console.error('Download failed:', error);
                                        toast({
                                          title: 'Download Failed',
                                          description: 'Could not download the file. Please try again.',
                                          variant: 'destructive'
                                        });
                                      }
                                    }}
                                    className="h-8 px-2 text-xs"
                                  >
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
                    <DialogTitle>Reject Service Extension Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the service extension request for <strong>{currentRequestToAction.employee.name}</strong>. This reason will be visible to the HRO.
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
                    <Button variant="outline" onClick={() => { setIsRejectionModalOpen(false); setCurrentRequestToAction(null); }}>Cancel</Button>
                    <Button variant="destructive" onClick={handleRejectionSubmit} disabled={!rejectionReasonInput.trim()}>Submit Rejection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {requestToCorrect && (
        <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correct Service Extension Request: {requestToCorrect.id}</DialogTitle>
              <DialogDescription>
                Update the details for <strong>{requestToCorrect.employee.name}</strong>'s service extension request and upload new documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="correctedCurrentRetirementDate" className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                    Current Retirement Date
                  </Label>
                  <Input 
                    id="correctedCurrentRetirementDate" 
                    type="date" 
                    value={correctedCurrentRetirementDate} 
                    onChange={(e) => setCorrectedCurrentRetirementDate(e.target.value)} 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="correctedRequestedExtensionPeriod">Requested Extension Period</Label>
                  <Input 
                    id="correctedRequestedExtensionPeriod" 
                    placeholder="e.g., 1 year, 6 months" 
                    value={correctedRequestedExtensionPeriod} 
                    onChange={(e) => setCorrectedRequestedExtensionPeriod(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="correctedJustification">Justification for Extension</Label>
                  <Textarea 
                    id="correctedJustification" 
                    placeholder="Provide detailed justification for the service extension" 
                    value={correctedJustification} 
                    onChange={(e) => setCorrectedJustification(e.target.value)} 
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="correctedLetterOfRequest" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    Upload Letter of Request (Required, PDF Only)
                  </Label>
                  <FileUpload
                    folder="service-extension"
                    value={correctedLetterOfRequestFile}
                    onChange={setCorrectedLetterOfRequestFile}
                    onPreview={handlePreviewFile}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="correctedEmployeeConsentLetter" className="flex items-center">
                    <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                    Upload Employee Consent Letter (Required, PDF Only)
                  </Label>
                  <FileUpload
                    folder="service-extension"
                    value={correctedEmployeeConsentLetterFile}
                    onChange={setCorrectedEmployeeConsentLetterFile}
                    onPreview={handlePreviewFile}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => { 
                  setIsCorrectionModalOpen(false); 
                  setRequestToCorrect(null); 
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleConfirmResubmit(requestToCorrect)}
                disabled={!correctedCurrentRetirementDate || !correctedRequestedExtensionPeriod || !correctedJustification || correctedLetterOfRequestFile === '' || correctedEmployeeConsentLetterFile === ''}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Resubmit Corrected Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPreviewModalOpen(false);
            setPreviewObjectKey(null);
          }
        }}
        objectKey={previewObjectKey}
      />
    </div>
  );
}

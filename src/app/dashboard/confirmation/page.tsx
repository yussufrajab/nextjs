
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast }  from '@/hooks/use-toast';
import { Loader2, Search, FileText, CheckCircle, Award, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, isAfter } from 'date-fns';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

interface ConfirmationRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  documents: string[];
  rejectionReason?: string | null;
  createdAt: string;
  decisionDate?: string | null;
  commissionDecisionDate?: string | null;
}

export default function ConfirmationPage() {
  const { role, user, isLoading: isAuthLoading } = useAuth();
  const [zanId, setZanId] = useState('');
  const [employeeToConfirm, setEmployeeToConfirm] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  
  const [evaluationFormFile, setEvaluationFormFile] = useState<string>('');
  const [ipaCertificateFile, setIpaCertificateFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIpaRequired, setIsIpaRequired] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<ConfirmationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ConfirmationRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<ConfirmationRequest | null>(null);

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<ConfirmationRequest | null>(null);
  const [correctedEvaluationFormFile, setCorrectedEvaluationFormFile] = useState<string>('');
  const [correctedIpaCertificateFile, setCorrectedIpaCertificateFile] = useState<string>('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  // Handle file preview
  const handlePreviewFile = (objectKey: string) => {
    setPreviewObjectKey(objectKey);
    setIsPreviewModalOpen(true);
  };

  const fetchRequests = async () => {
    if (!user || !role) return;
    setIsLoading(true);
    try {
      console.log('Fetching confirmation requests...');
      // The backend consistently requires userId and userRole. Send both always.
      // Client-side filtering will then handle role-specific display logic.
      let url = `/api/confirmations?userId=${user.id}&userRole=${role}`;

      const response = await fetch(url);
      console.log('Response received:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch confirmation requests. Status:', response.status, 'Error Text:', errorText);
        throw new Error(`Failed to fetch confirmation requests: ${response.status} - ${errorText}`);
      }

      const allRequests = await response.json();
      console.log('Fetched data (before client-side filter):', allRequests);

      // Log the user and role to confirm they are correctly identified
      console.log('Current user:', user);
      console.log('Current role:', role);

      allRequests.forEach((req: ConfirmationRequest) => {
        console.log(`Request ID: ${req.id}, Status: ${req.status}, Review Stage: ${req.reviewStage}`);
      });

      const filteredData = allRequests.filter((req: ConfirmationRequest) => {
        if (role === ROLES.HHRMD || role === ROLES.HRMO) {
          return req.status !== 'Approved by Commission' &&
                 !req.status.includes('Rejected by Commission') &&
                 req.reviewStage !== 'completed';
        } else if (role === ROLES.HRO) {
          return req.submittedById === user.id;
        }
        return true;
      });

      console.log('Filtered data:', filteredData);
      // Additional debug for HHRMD
      if (role === ROLES.HHRMD) {
        console.log('HHRMD Debug - Showing requests with following reviewStages:');
        filteredData.forEach((req: ConfirmationRequest) => {
          console.log(`- ID: ${req.id}, Status: "${req.status}", ReviewStage: "${req.reviewStage}"`);
        });
      }
      setPendingRequests(filteredData);
    } catch (error: any) {
      console.error('Error in fetchRequests:', error);
      toast({ title: "Error", description: `Could not load confirmation requests: ${error.message || error}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user && role) {
      fetchRequests();
    }
  }, [user, role, isAuthLoading]);

  const isAlreadyConfirmed = employeeToConfirm?.status === 'Confirmed';

  const resetEmployeeAndForm = () => {
    setEmployeeToConfirm(null); 
    setEvaluationFormFile('');
    setIpaCertificateFile('');
    setLetterOfRequestFile('');
    setIsIpaRequired(false);
  }

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
    resetEmployeeAndForm();

    try {
        console.log(`[CONFIRMATION] Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`[CONFIRMATION] Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[CONFIRMATION] API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        console.log(`[CONFIRMATION] Found employee: ${foundEmployee.name}`); // Debug log

        setEmployeeToConfirm(foundEmployee);
        if (foundEmployee.employmentDate) {
            try {
                const employmentDate = parseISO(foundEmployee.employmentDate);
                const cutoffDate = new Date('2014-05-01');
                if (isAfter(employmentDate, cutoffDate)) setIsIpaRequired(true);
            } catch (error) {
                toast({ title: "Date Error", description: "Could not parse employee's employment date.", variant: "destructive" });
            }
        }
        if (foundEmployee.status === 'Confirmed') {
            toast({ title: "Already Confirmed", description: "This employee has already been confirmed.", variant: "destructive", duration: 5000 });
        } else {
            toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded successfully.` });
        }
    } catch (error: any) {
        console.error(`[CONFIRMATION] Search failed:`, error); // Debug log
        const errorMessage = error.message || `No employee found with ZanID: ${cleanZanId}.`;
        toast({ title: "Employee Not Found", description: errorMessage, variant: "destructive" });
    } finally {
        setIsFetchingEmployee(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!employeeToConfirm || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }
    // Validation checks...
    if (evaluationFormFile === '' || letterOfRequestFile === '' || (isIpaRequired && ipaCertificateFile === '')) {
        toast({ title: "Validation Error", description: "Please check all required documents are attached.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    
    const documentsList = [evaluationFormFile, letterOfRequestFile];
    if (isIpaRequired && ipaCertificateFile) documentsList.push(ipaCertificateFile);

    const payload = {
      employeeId: employeeToConfirm.id,
      submittedById: user.id,
      documents: documentsList,
      status: 'Pending HRMO/HHRMD Review', // Both roles can review in parallel
      reviewStage: 'initial'
    };
    
    try {
      const response = await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to submit request');
      
      await fetchRequests(); // Refresh the list
      toast({ title: "Request Submitted", description: `Confirmation request for ${employeeToConfirm.name} submitted successfully.` });
      setZanId('');
      resetEmployeeAndForm();
    } catch(error) {
      toast({ title: "Submission Failed", description: "Could not submit the confirmation request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateRequest = async (requestId: string, payload: any) => {
      try {
          const response = await fetch(`/api/confirmations`, {
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


  const handleInitialAction = async (requestId: string, action: 'forward' | 'reject') => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;

    if (action === 'reject') {
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    } else if (action === 'forward') {
      // Both HRMO and HHRMD forward directly to Commission (parallel workflow)
      const payload = { status: "Request Received – Awaiting Commission Decision", reviewStage: 'commission_review', decisionDate: new Date().toISOString() };
      
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
        reviewStage: 'initial',
        decisionDate: new Date().toISOString()
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
    const request = pendingRequests.find(req => req.id === requestId);
    const finalStatus = decision === 'approved' ? "Approved by Commission" : "Rejected by Commission - Request Concluded";
    const payload = { status: finalStatus, reviewStage: 'completed', commissionDecisionDate: new Date().toISOString() };
    const success = await handleUpdateRequest(requestId, payload);
     if (success) {
        const title = `Commission Decision: ${decision === 'approved' ? 'Approved' : 'Rejected'}`;
        const description = decision === 'approved' 
          ? `Request approved. Employee ${request?.employee.name} status updated to "Confirmed".`
          : `Request ${requestId} has been rejected.`;
        toast({ title, description });
    }
  };

  const handleResubmit = (request: ConfirmationRequest) => {
    setRequestToCorrect(request);
    setCorrectedEvaluationFormFile('');
    setCorrectedIpaCertificateFile('');
    setCorrectedLetterOfRequestFile('');
    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: ConfirmationRequest | null) => {
    if (!request || !user) return;

    if (correctedEvaluationFormFile === '' || correctedLetterOfRequestFile === '' || 
        ((requestToCorrect?.employee.employmentDate && isAfter(parseISO(requestToCorrect.employee.employmentDate), new Date('2014-05-01')) || 
          requestToCorrect?.documents.includes('IPA Certificate')) && correctedIpaCertificateFile === '')) {
      toast({ title: "Submission Error", description: "All required documents must be attached.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/confirmations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRMO/HHRMD Review', // Both roles can review in parallel after correction
          reviewStage: 'initial',
          documents: [
            correctedEvaluationFormFile,
            correctedIpaCertificateFile,
            correctedLetterOfRequestFile,
          ].filter(Boolean),
          rejectionReason: null, // Clear rejection reason on resubmission
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resubmit confirmation request');
      }

      toast({ title: "Success", description: `Confirmation request ${request.id} resubmitted.` });
      setIsCorrectionModalOpen(false);
      setRequestToCorrect(null);
      fetchRequests();
    } catch (error) {
      console.error("[RESUBMIT_CONFIRMATION]", error);
      toast({ title: "Error", description: "Failed to resubmit confirmation request.", variant: "destructive" });
    }
  };

  const isSubmitDisabled = !employeeToConfirm || evaluationFormFile === '' || (isIpaRequired && ipaCertificateFile === '') || letterOfRequestFile === '' || isSubmitting || isAlreadyConfirmed;
  
  // Debug logging for button state
  console.log('Submit button state:', {
    hasEmployee: !!employeeToConfirm,
    evaluationFormFile,
    ipaCertificateFile,
    letterOfRequestFile,
    isIpaRequired,
    isSubmitting,
    isAlreadyConfirmed,
    isDisabled: isSubmitDisabled
  });
  
  const paginatedRequests = pendingRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  return (
    <div>
      <PageHeader title="Employee Confirmation" description="Manage employee confirmation processes." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Confirmation Request</CardTitle>
            <CardDescription>Enter employee's ZanID to fetch details. Required documents will be determined by hiring date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanId">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanId" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
                <Button onClick={handleFetchEmployeeDetails} disabled={isFetchingEmployee || !zanId || isSubmitting}>
                  {isFetchingEmployee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Fetch Details
                </Button>
              </div>
            </div>

            {employeeToConfirm && (
              <div className="space-y-6 pt-2">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-foreground">Employee Details</h3>
                  <div className="p-4 rounded-md border bg-secondary/20 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <div><Label className="text-muted-foreground">Name:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.name}</p></div>
                      <div><Label className="text-muted-foreground">ZanID:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.zanId}</p></div>
                      <div><Label className="text-muted-foreground">Payroll Number:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.payrollNumber || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">ZSSF Number:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.zssfNumber || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Department:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.department || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Cadre/Position:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.cadre || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.employmentDate ? format(parseISO(employeeToConfirm.employmentDate.toString()), 'PPP') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeToConfirm.dateOfBirth ? format(parseISO(employeeToConfirm.dateOfBirth.toString()), 'PPP') : 'N/A'}</p></div>
                      <div className="lg:col-span-1"><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{typeof employeeToConfirm.institution === 'object' ? employeeToConfirm.institution?.name : employeeToConfirm.institution || 'N/A'}</p></div>
                      <div className="md:col-span-2 lg:col-span-3"><Label className="text-muted-foreground">Current Status:</Label> <p className={`font-semibold ${employeeToConfirm.status === 'Confirmed' ? 'text-green-600' : employeeToConfirm.status === 'On Probation' ? 'text-orange-500' : 'text-foreground'}`}>{employeeToConfirm.status || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>
                
                {isAlreadyConfirmed && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Already Confirmed</AlertTitle>
                    <AlertDescription>This employee is already confirmed.</AlertDescription>
                  </Alert>
                )}
            
                <div className={`space-y-4 ${isAlreadyConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-foreground">Required Documents (PDF Only)</h3>
                  {isIpaRequired && (
                    <p className="text-sm text-muted-foreground -mt-3 mb-2">
                     IPA Certificate is required for this employee (hired from May 2014 onwards).
                    </p>
                  )}
                  <div>
                    <Label className="flex items-center mb-2"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Evaluation Form</Label>
                    <FileUpload
                      onChange={setEvaluationFormFile}
                      folder="confirmation/evaluation-forms"
                      accept=".pdf"
                      maxSize={2}
                      disabled={isSubmitting || isAlreadyConfirmed}
                    />
                  </div>
                  {isIpaRequired && (
                    <div>
                        <Label className="flex items-center mb-2"><Award className="mr-2 h-4 w-4 text-primary" />Upload IPA Certificate</Label>
                        <FileUpload
                          onChange={setIpaCertificateFile}
                          folder="confirmation/ipa-certificates"
                          accept=".pdf"
                          maxSize={2}
                          disabled={isSubmitting || isAlreadyConfirmed}
                        />
                    </div>
                  )}
                  <div>
                    <Label className="flex items-center mb-2"><CheckCircle className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request</Label>
                    <FileUpload
                      onChange={setLetterOfRequestFile}
                      folder="confirmation/letters"
                      accept=".pdf"
                      maxSize={2}
                      disabled={isSubmitting || isAlreadyConfirmed}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {employeeToConfirm && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button onClick={handleSubmitRequest} disabled={isSubmitDisabled}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
            </CardFooter>
          )}
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            {role === ROLES.HRO ? "My Confirmation Requests" : "Review Confirmation Requests"}
          </CardTitle>
          <CardDescription>
            {role === ROLES.HRO ? "View and manage your submitted confirmation requests." : "Review, approve, or reject pending employee confirmation requests."}
          </CardDescription>
        </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">Confirmation for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Department: {request.employee.department}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {format(parseISO(request.createdAt), 'PPP')} by {request.submittedBy.name}</p>
                  {request.decisionDate && <p className="text-sm text-muted-foreground">Initial Review Date: {format(parseISO(request.decisionDate), 'PPP')}</p>}
                  {request.commissionDecisionDate && <p className="text-sm text-muted-foreground">Commission Decision Date: {format(parseISO(request.commissionDecisionDate), 'PPP')}</p>}
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">
                    {request.status}
                  </span></p>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                     {(role === ROLES.HHRMD || role === ROLES.HRMO) && (
                      <>
                        {/* HRMO/HHRMD Parallel Review Actions */}
                        {(role === ROLES.HRMO || role === ROLES.HHRMD) && (request.status === 'Pending HRMO/HHRMD Review') && (
                          <>
                            <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify &amp; Forward to Commission</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject &amp; Return to HRO</Button>
                          </>
                        )}
                        {/* HHRMD also handles commission decisions */}
                        {role === ROLES.HHRMD && request.reviewStage === 'commission_review' && request.status === 'Request Received – Awaiting Commission Decision' && (
                          <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCommissionDecision(request.id, 'approved')}>Approved by Commission</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleCommissionDecision(request.id, 'rejected')}>Rejected by Commission</Button>
                          </>
                        )}
                      </>
                    )}
                    {role === ROLES.HRO && (request.status === 'Rejected by HRMO - Awaiting HRO Correction' || request.status === 'Rejected by HHRMD - Awaiting HRO Correction') && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleResubmit(request)}>
                        Correct and Resubmit
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No confirmation requests pending your review.</p>
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

      {selectedRequest && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                Confirmation for <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
                <div className="space-y-1 border-b pb-3 mb-3">
                    <h4 className="font-semibold text-base text-foreground mb-2">Employee Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Full Name:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.name}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">ZanID:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.zanId}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Payroll #:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.payrollNumber || 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">ZSSF #:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.zssfNumber || 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Department:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.department}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Cadre:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.cadre}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Employment Date:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.employmentDate ? format(parseISO(selectedRequest.employee.employmentDate), 'PPP') : 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">DOB:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.dateOfBirth ? format(parseISO(selectedRequest.employee.dateOfBirth), 'PPP') : 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Institution:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.institution?.name || 'N/A'}</p></div>
                </div>

                <div className="space-y-1">
                    <h4 className="font-semibold text-base text-foreground mb-2">Request Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2"><Label className="text-right font-semibold">Submitted:</Label><p className="col-span-2">{format(parseISO(selectedRequest.createdAt), 'PPP')} by {selectedRequest.submittedBy.name}</p></div>
                     {selectedRequest.decisionDate && <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2"><Label className="text-right font-semibold">Initial Review:</Label><p className="col-span-2">{format(parseISO(selectedRequest.decisionDate), 'PPP')}</p></div>}
                    {selectedRequest.commissionDecisionDate && <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2"><Label className="text-right font-semibold">Commission Date:</Label><p className="col-span-2">{format(parseISO(typeof selectedRequest.commissionDecisionDate === 'string' ? selectedRequest.commissionDecisionDate : selectedRequest.commissionDecisionDate.toISOString()), 'PPP')}</p></div>}
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2"><Label className="text-right font-semibold">Status:</Label><p className="col-span-2 text-primary">{selectedRequest.status}</p></div>
                    {selectedRequest.rejectionReason && <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2"><Label className="text-right font-semibold text-destructive pt-1">Rejection Reason:</Label><p className="col-span-2 text-destructive">{selectedRequest.rejectionReason}</p></div>}
                </div>
                 <div className="pt-3 mt-3 border-t">
                    <Label className="font-semibold">Attached Documents</Label>
                    <div className="mt-2 space-y-2">
                    {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                        selectedRequest.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm">
                                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-foreground truncate" title={doc}>{doc}</span></div>
                                <Button variant="link" size="sm" className="h-auto p-0 flex-shrink-0" onClick={() => handlePreviewFile(doc)}>Preview</Button>
                            </div>
                        ))
                    ) : ( <p className="text-muted-foreground text-sm">No documents attached.</p> )}
                    </div>
                </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {currentRequestToAction && (
        <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject Confirmation: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>Provide the reason for rejecting the confirmation for <strong>{currentRequestToAction.employee.name}</strong>.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea placeholder="Enter rejection reason here..." value={rejectionReasonInput} onChange={(e) => setRejectionReasonInput(e.target.value)} rows={4} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRejectionModalOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleRejectionSubmit} disabled={!rejectionReasonInput.trim()}>Submit Rejection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {requestToCorrect && (
        <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Correct & Resubmit Confirmation Request</DialogTitle>
              <DialogDescription>
                Please upload the corrected documents for <strong>{requestToCorrect.employee.name}</strong> (ZanID: {requestToCorrect.employee.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  All required PDF documents must be re-attached, even if only one needed correction.
                </AlertDescription>
              </Alert>
              <div>
                <Label className="flex items-center mb-2"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Corrected Evaluation Form</Label>
                <FileUpload
                  onChange={setCorrectedEvaluationFormFile}
                  folder="confirmation/evaluation-forms"
                  accept=".pdf"
                  maxSize={2}
                />
              </div>
              {(requestToCorrect.employee.employmentDate && isAfter(parseISO(requestToCorrect.employee.employmentDate), new Date('2014-05-01')) || 
                requestToCorrect.documents.includes('IPA Certificate')) && (
                <div>
                  <Label className="flex items-center mb-2"><Award className="mr-2 h-4 w-4 text-primary" />Upload Corrected IPA Certificate</Label>
                  <FileUpload
                    onChange={setCorrectedIpaCertificateFile}
                    folder="confirmation/ipa-certificates"
                    accept=".pdf"
                    maxSize={2}
                  />
                </div>
              )}
              <div>
                <Label className="flex items-center mb-2"><CheckCircle className="mr-2 h-4 w-4 text-primary" />Upload Corrected Letter of Request</Label>
                <FileUpload
                  onChange={setCorrectedLetterOfRequestFile}
                  folder="confirmation/letters"
                  accept=".pdf"
                  maxSize={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCorrectionModalOpen(false)}>Cancel</Button>
              <Button onClick={() => handleConfirmResubmit(requestToCorrect)}>
                Resubmit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        objectKey={previewObjectKey}
        title="Document Preview"
      />
    </div>
  );
}

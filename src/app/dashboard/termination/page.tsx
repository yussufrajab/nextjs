
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import React, { useState, useEffect } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, CalendarDays, Paperclip, ShieldAlert, FileWarning, PauseOctagon, Files, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { apiClient } from '@/lib/api-client';


interface SeparationRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  createdAt: string;
  type: 'TERMINATION' | 'DISMISSAL';
  reason: string;
  documents: string[];
}


export default function TerminationAndDismissalPage() {
  const { role, user } = useAuth();
  const { accessToken } = useAuthStore();
  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [employeeStatus, setEmployeeStatus] = useState<'probation' | 'confirmed' | null>(null);

  const [reason, setReason] = useState('');

  // Common compulsory document
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  // Termination (probation) documents
  const [terminationSupportingDocFile, setTerminationSupportingDocFile] = useState<string>('');

  // Dismissal (confirmed) documents
  const [misconductEvidenceFile, setMisconductEvidenceFile] = useState<string>('');
  const [summonNoticeFile, setSummonNoticeFile] = useState<string>('');
  const [suspensionLetterFile, setSuspensionLetterFile] = useState<string>('');
  const [warningLettersFile, setWarningLettersFile] = useState<string>('');
  const [employeeExplanationLetterFile, setEmployeeExplanationLetterFile] = useState<string>('');
  const [otherAdditionalDocumentsFile, setOtherAdditionalDocumentsFile] = useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<SeparationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SeparationRequest | null>(null);
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
  const [currentRequestToAction, setCurrentRequestToAction] = useState<SeparationRequest | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<SeparationRequest | null>(null);
  const [correctedReason, setCorrectedReason] = useState('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] = useState<string>('');
  const [correctedSupportingDocumentFile, setCorrectedSupportingDocumentFile] = useState<string>('');

  const fetchRequests = async () => {
    if (!user || !role) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/termination?userId=${user.id}&userRole=${role}&userInstitutionId=${user.institutionId || ''}`);
      if (!response.ok) throw new Error('Failed to fetch separation requests');
      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      toast({ title: "Error", description: "Could not load separation requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, role]);


  const resetFormFields = () => {
    setReason('');
    setEmployeeStatus(null);
    setLetterOfRequestFile('');
    setTerminationSupportingDocFile('');
    setMisconductEvidenceFile('');
    setSummonNoticeFile('');
    setSuspensionLetterFile('');
    setWarningLettersFile('');
    setEmployeeExplanationLetterFile('');
    setOtherAdditionalDocumentsFile('');
  };

  const isSubmitButtonDisabled = () => {
    if (!employeeDetails || !employeeStatus || !reason.trim() || letterOfRequestFile === '' || isSubmitting) {
      return true;
    }
    
    if (employeeStatus === 'probation') {
      // For termination, need supporting document
      return terminationSupportingDocFile === '';
    } else {
      // For dismissal, need required documents
      return misconductEvidenceFile === '' || summonNoticeFile === '' || suspensionLetterFile === '';
    }
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
        console.log(`[TERMINATION] Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`[TERMINATION] Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TERMINATION] API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        console.log(`[TERMINATION] Found employee: ${foundEmployee.name}`); // Debug log

        setEmployeeDetails(foundEmployee);
        setEmployeeStatus(foundEmployee.status === 'On Probation' ? 'probation' : 'confirmed');
        toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded successfully.` });
    } catch (error: any) {
        console.error(`[TERMINATION] Error fetching employee:`, error); // Debug log
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
        const response = await fetch(`/api/termination`, {
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

  const handleSubmitRequest = async () => {
    if (!employeeDetails || !employeeStatus || !user) {
      toast({ title: "Submission Error", description: "Employee details are missing.", variant: "destructive" });
      return;
    }
    // Validation checks...

    const documentObjectKeys: string[] = [];
    let type: 'TERMINATION' | 'DISMISSAL';
    
    // Add letter of request (always required)
    if (letterOfRequestFile) documentObjectKeys.push(letterOfRequestFile);
    
    if (employeeStatus === 'probation') {
      type = 'TERMINATION';
      if (terminationSupportingDocFile) documentObjectKeys.push(terminationSupportingDocFile);
    } else {
      type = 'DISMISSAL';
      if (misconductEvidenceFile) documentObjectKeys.push(misconductEvidenceFile);
      if (summonNoticeFile) documentObjectKeys.push(summonNoticeFile);
      if (suspensionLetterFile) documentObjectKeys.push(suspensionLetterFile);
      if (warningLettersFile) documentObjectKeys.push(warningLettersFile);
      if (employeeExplanationLetterFile) documentObjectKeys.push(employeeExplanationLetterFile);
      if (otherAdditionalDocumentsFile) documentObjectKeys.push(otherAdditionalDocumentsFile);
    }

    setIsSubmitting(true);
    
    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending DO/HHRMD Review',
      reason: reason,
      type,
      documents: documentObjectKeys
    };

    try {
        const response = await fetch('/api/termination', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to submit request');
        
        await fetchRequests(); // Refresh list
        toast({ title: "Request Submitted", description: `${type} request for ${employeeDetails.name} submitted successfully.` });
        setZanId('');
        setEmployeeDetails(null);
        resetFormFields();
    } catch(error) {
        toast({ title: "Submission Failed", description: "Could not submit the request.", variant: "destructive" });
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
    const request = pendingRequests.find(req => req.id === requestId);
    const finalStatus = decision === 'approved' ? "Approved by Commission" : "Rejected by Commission - Request Concluded";
    const payload = { status: finalStatus, reviewStage: 'completed' };
    const success = await handleUpdateRequest(requestId, payload);
    if (success) {
        const title = `Commission Decision: ${decision === 'approved' ? 'Approved' : 'Rejected'}`;
        const description = decision === 'approved' 
            ? `${request?.type || 'Separation'} request approved. Employee status will be updated accordingly.`
            : `Request ${requestId} has been rejected by commission.`;
        toast({ title, description });
    }
  };

  const handleCorrection = (request: SeparationRequest) => {
    setRequestToCorrect(request);
    setCorrectedReason(request.reason || '');
    setCorrectedLetterOfRequestFile('');
    setCorrectedSupportingDocumentFile('');
    
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => (input as HTMLInputElement).value = '');
    
    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: SeparationRequest | null) => {
    if (!request || !user) {
      toast({ title: "Error", description: "Request or user details are missing.", variant: "destructive" });
      return;
    }

    if (!correctedReason || !correctedLetterOfRequestFile) {
      toast({ title: "Validation Error", description: "Please fill all required fields and upload required documents.", variant: "destructive" });
      return;
    }

    let documentsList: string[] = ['Letter of Request'];
    if (correctedSupportingDocumentFile) {
      documentsList.push(request.type === 'TERMINATION' ? 'Supporting Document' : 'Misconduct Evidence');
    }

    try {
      const response = await fetch(`/api/termination`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending DO/HHRMD Review',
          reviewStage: 'initial',
          reason: correctedReason,
          documents: documentsList,
          rejectionReason: null,
          reviewedById: user.id
        }),
      });

      if (!response.ok) throw new Error('Failed to update request');

      await fetchRequests();
      toast({ title: "Request Corrected", description: `${request.type} request for ${request.employee.name} has been corrected and resubmitted.` });
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
      <PageHeader title="Termination and Dismissal" description="Process employee terminations for probationers and dismissals for confirmed staff." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Termination or Dismissal Request</CardTitle>
            <CardDescription>Enter ZanID to fetch employee details. The required form will appear based on the employee's status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdInput">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdInput" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
                <Button onClick={handleFetchEmployeeDetails} disabled={isFetchingEmployee || !zanId || isSubmitting}>
                  {isFetchingEmployee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Fetch Details
                </Button>
              </div>
            </div>

            {employeeDetails && employeeStatus && (
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
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeDetails.employmentDate ? format(parseISO(employeeDetails.employmentDate), 'MMMM do, yyyy') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeDetails.dateOfBirth ? format(parseISO(employeeDetails.dateOfBirth), 'MMMM do, yyyy') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{employeeDetails.institution?.name || 'N/A'}</p></div>
                      <div className="md:col-span-2 lg:col-span-3"><Label className="text-muted-foreground">Current Status:</Label> <p className={`font-semibold ${employeeDetails.status === 'On Probation' ? 'text-orange-600' : 'text-green-600'}`}>{employeeDetails.status || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">More Details ...</h3>
                  <div>
                    <Label htmlFor="reason">Reason for Firing</Label>
                    <Textarea id="reason" placeholder="Clearly state the grounds for firing..." value={reason} onChange={(e) => setReason(e.target.value)} disabled={isSubmitting} />
                  </div>
                  
                  {/* Common Document */}
                  <div>
                    <Label htmlFor="letterOfRequestFile" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request (Required, PDF)</Label>
                    <FileUpload
                      folder="termination"
                      value={letterOfRequestFile}
                      onChange={setLetterOfRequestFile}
                      onPreview={handlePreviewFile}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  {/* Termination Documents (for probationers) */}
                  {employeeStatus === 'probation' && (
                    <div>
                      <Label htmlFor="terminationSupportingDocFile" className="flex items-center"><Paperclip className="mr-2 h-4 w-4 text-primary" />Upload Supporting Document for Termination (Required, PDF)</Label>
                      <FileUpload
                        folder="termination"
                        value={terminationSupportingDocFile}
                        onChange={setTerminationSupportingDocFile}
                        onPreview={handlePreviewFile}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  )}

                  {/* Dismissal Documents (for confirmed employees) */}
                  {employeeStatus === 'confirmed' && (
                    <>
                      <h4 className="text-md font-medium text-foreground pt-2">Required Dismissal Documents (PDF Only)</h4>
                      <div>
                        <Label htmlFor="misconductEvidenceFile" className="flex items-center"><ShieldAlert className="mr-2 h-4 w-4 text-destructive" />Upload Misconduct Evidence &amp; Primary Investigation Report</Label>
                        <FileUpload
                          folder="termination"
                          value={misconductEvidenceFile}
                          onChange={setMisconductEvidenceFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="summonNoticeFile" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Summon Notice / Invitation Letter</Label>
                        <FileUpload
                          folder="termination"
                          value={summonNoticeFile}
                          onChange={setSummonNoticeFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="suspensionLetterFile" className="flex items-center"><PauseOctagon className="mr-2 h-4 w-4 text-red-500" />Upload Suspension Letter</Label>
                        <FileUpload
                          folder="termination"
                          value={suspensionLetterFile}
                          onChange={setSuspensionLetterFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                      <h4 className="text-md font-medium text-foreground pt-2">Optional Supporting Documents (PDF Only)</h4>
                      <div>
                        <Label htmlFor="warningLettersFile" className="flex items-center"><FileWarning className="mr-2 h-4 w-4 text-orange-500" />Upload Warning Letter(s)</Label>
                        <FileUpload
                          folder="termination"
                          value={warningLettersFile}
                          onChange={setWarningLettersFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="employeeExplanationLetterFile" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Employee Explanation Letter</Label>
                        <FileUpload
                          folder="termination"
                          value={employeeExplanationLetterFile}
                          onChange={setEmployeeExplanationLetterFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="otherAdditionalDocumentsFile" className="flex items-center"><Files className="mr-2 h-4 w-4 text-primary" />Upload Other Additional Documents</Label>
                        <FileUpload
                          folder="termination"
                          value={otherAdditionalDocumentsFile}
                          onChange={setOtherAdditionalDocumentsFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && employeeStatus && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button onClick={handleSubmitRequest} disabled={isSubmitButtonDisabled()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit {employeeStatus === 'probation' ? 'Termination' : 'Dismissal'} Request
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Your Submitted Termination & Dismissal Requests</CardTitle>
            <CardDescription>Track the status of termination and dismissal requests you have submitted.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">{request.type} for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Reason: {request.reason}</p>
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
              <p className="text-muted-foreground">No termination/dismissal requests found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {(role === ROLES.DO || role === ROLES.HHRMD ) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Review Termination &amp; Dismissal Requests</CardTitle>
            <CardDescription>Review, approve, or reject pending requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">{request.type} for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Reason: {request.reason}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                     {(role === ROLES.DO || role === ROLES.HHRMD) && (request.status === 'Pending DO/HHRMD Review') && (
                      <>
                        <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify &amp; Forward to Commission</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject &amp; Return to HRO</Button>
                      </>
                    )}
                     {request.reviewStage === 'commission_review' && (
                        <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCommissionDecision(request.id, 'approved')}>Approved by Commission</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleCommissionDecision(request.id, 'rejected')}>Rejected by Commission</Button>
                        </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No requests pending your review.</p>
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
              <DialogTitle>{selectedRequest.type} Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                For <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
                <div className="space-y-1 border-b pb-3 mb-3">
                    <h4 className="font-semibold text-base text-foreground mb-2">Employee Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Name:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.name}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">ZanID:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.zanId}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Payroll #:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.payrollNumber || 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">ZSSF #:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.zssfNumber || 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Department:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.department}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1"><Label className="text-right text-muted-foreground">Institution:</Label><p className="col-span-2 font-medium">{selectedRequest.employee.institution?.name || 'N/A'}</p></div>
                </div>
                 <div className="space-y-1">
                     <h4 className="font-semibold text-base text-foreground mb-2">Request Information</h4>
                     <div className="space-y-2">
                        <div><Label className="font-semibold">Reason Summary:</Label><p className="pl-2">{selectedRequest.reason}</p></div>
                        <p><Label className="font-semibold">Submitted:</Label> {selectedRequest.createdAt ? format(parseISO(selectedRequest.createdAt), 'PPP') : 'N/A'} by {selectedRequest.submittedBy.name}</p>
                        <p><Label className="font-semibold">Status:</Label> <span className="text-primary">{selectedRequest.status}</span></p>
                        {selectedRequest.rejectionReason && (
                           <div><Label className="font-semibold text-destructive">Rejection Reason:</Label><p className="pl-2 text-destructive">{selectedRequest.rejectionReason}</p></div>
                        )}
                    </div>
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
                    <DialogTitle>Reject Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the request for <strong>{currentRequestToAction.employee.name}</strong>. This reason will be visible to the HRO.
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

      {requestToCorrect && (
        <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correct {requestToCorrect.type} Request: {requestToCorrect.id}</DialogTitle>
              <DialogDescription>
                Update the details for <strong>{requestToCorrect.employee.name}</strong>'s {requestToCorrect.type.toLowerCase()} request and upload new documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="correctedReason">Reason for {requestToCorrect.type}</Label>
                  <Textarea 
                    id="correctedReason" 
                    placeholder="Provide detailed reason for the termination/dismissal" 
                    value={correctedReason} 
                    onChange={(e) => setCorrectedReason(e.target.value)} 
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="correctedLetterOfRequest" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    Upload Letter of Request (Required, PDF Only)
                  </Label>
                  <FileUpload
                    folder="termination"
                    value={correctedLetterOfRequestFile}
                    onChange={setCorrectedLetterOfRequestFile}
                    onPreview={handlePreviewFile}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="correctedSupportingDocument" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    Upload Supporting Document (Optional, PDF Only)
                  </Label>
                  <FileUpload
                    folder="termination"
                    value={correctedSupportingDocumentFile}
                    onChange={setCorrectedSupportingDocumentFile}
                    onPreview={handlePreviewFile}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {requestToCorrect.type === 'TERMINATION' ? 'Supporting Document for termination' : 'Misconduct evidence, summon notice, or suspension letter'}
                  </p>
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
                disabled={!correctedReason || correctedLetterOfRequestFile === ''}
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

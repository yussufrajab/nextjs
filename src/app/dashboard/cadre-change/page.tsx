
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, Award, ChevronsUpDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { format, parseISO, differenceInYears } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { apiClient } from '@/lib/api-client';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { useAuthStore } from '@/store/auth-store';

interface CadreChangeRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  createdAt: string;

  newCadre: string;
  reason?: string | null;
  documents: string[];
  studiedOutsideCountry?: boolean | null;
}

export default function CadreChangePage() {
  const { role, user } = useAuth();
  const { accessToken } = useAuthStore();
  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newCadre, setNewCadre] = useState('');
  const [reasonCadreChange, setReasonCadreChange] = useState('');
  const [certificateFile, setCertificateFile] = useState<string>('');
  const [studiedOutsideCountry, setStudiedOutsideCountry] = useState(false);
  const [tcuFormFile, setTcuFormFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<CadreChangeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CadreChangeRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<CadreChangeRequest | null>(null);

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<CadreChangeRequest | null>(null);
  const [correctedCertificateFile, setCorrectedCertificateFile] = useState<string>('');
  const [correctedTcuFormFile, setCorrectedTcuFormFile] = useState<string>('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] = useState<string>('');
  const [correctedNewCadre, setCorrectedNewCadre] = useState('');
  const [correctedReasonCadreChange, setCorrectedReasonCadreChange] = useState('');
  const [correctedStudiedOutsideCountry, setCorrectedStudiedOutsideCountry] = useState(false);

  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Handle file preview
  const handlePreviewFile = (objectKey: string) => {
    setPreviewObjectKey(objectKey);
    setIsPreviewModalOpen(true);
  };

  // Helper function to shorten document names for better display
  const getShortDocumentName = (fullPath: string): string => {
    // Extract the original filename from the path
    const fileName = fullPath.split('/').pop() || fullPath;
    
    // Remove timestamp and random string patterns
    const cleanName = fileName
      .replace(/^\d+_[a-zA-Z0-9]+_/, '') // Remove timestamp_randomString_ pattern
      .replace(/^[a-zA-Z0-9]+_/, ''); // Remove any remaining prefix_
    
    // If name is still too long, truncate it
    if (cleanName.length > 25) {
      const extension = cleanName.split('.').pop();
      const nameWithoutExt = cleanName.replace(/\.[^/.]+$/, '');
      return `${nameWithoutExt.substring(0, 20)}...${extension ? '.' + extension : ''}`;
    }
    
    return cleanName;
  };

  const fetchRequests = async (isRefresh = false) => {
    if (!user || !role) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
        // Add cache-busting parameter and headers for refresh
        const cacheBuster = isRefresh ? `&_t=${Date.now()}` : '';
        const response = await fetch(`/api/cadre-change?userId=${user.id}&userRole=${role}&userInstitutionId=${user.institutionId || ''}${cacheBuster}`, {
          method: 'GET',
          headers: {
            'Cache-Control': isRefresh ? 'no-cache, no-store, must-revalidate' : 'default',
            'Pragma': isRefresh ? 'no-cache' : 'default',
            'Expires': isRefresh ? '0' : 'default'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch cadre change requests');
        const result = await response.json();
        console.log('Cadre change API result:', result);
        console.log('result.data type:', typeof result.data, 'isArray:', Array.isArray(result.data));
        setPendingRequests(Array.isArray(result.data) ? result.data : []);
        if (isRefresh) {
          toast({ title: "Refreshed", description: "Cadre change requests have been updated.", duration: 2000 });
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not load cadre change requests.", variant: "destructive" });
    } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, role]);

  const resetFormFields = () => {
    setNewCadre('');
    setReasonCadreChange('');
    setCertificateFile('');
    setStudiedOutsideCountry(false);
    setTcuFormFile('');
    setLetterOfRequestFile('');
    const checkboxInput = document.getElementById('studiedOutsideCountryCadre') as HTMLInputElement;
    if (checkboxInput) checkboxInput.checked = false;
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
    setEligibilityError(null);

    try {
        console.log(`Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        console.log(`Found employee: ${foundEmployee.name}`); // Debug log

        let error = null;
        if (foundEmployee.status === 'On Probation' || foundEmployee.status === 'On LWOP') {
          error = `Employee is currently '${foundEmployee.status}' and is not eligible for a cadre change.`;
        } else if (foundEmployee.employmentDate) {
          const yearsOfService = differenceInYears(new Date(), parseISO(foundEmployee.employmentDate));
          if (yearsOfService < 3) {
            error = `Employee must have at least 3 years of service for a cadre change. Current service: ${yearsOfService} years.`;
          }
        }
        
        setEmployeeDetails(foundEmployee);
        
        if (error) {
          setEligibilityError(error);
          toast({ title: "Employee Ineligible", description: error, variant: "destructive", duration: 7000 });
        } else {
          setEligibilityError(null);
          toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded successfully.` });
        }
    } catch (error: any) {
        console.error(`Search failed:`, error); // Debug log
        const errorMessage = error.message || `No employee found with ZanID: ${cleanZanId}.`;
        toast({ title: "Employee Not Found", description: errorMessage, variant: "destructive" });
    } finally {
        setIsFetchingEmployee(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!!eligibilityError) {
      toast({ title: "Submission Error", description: "This employee is ineligible for a cadre change.", variant: "destructive" });
      return;
    }
    if (!employeeDetails || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }
    // Validation logic...
    if (!letterOfRequestFile || (studiedOutsideCountry && !tcuFormFile)) {
      toast({ title: "Submission Error", description: "Please upload all required documents.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    let documents = [letterOfRequestFile]; // Store actual file keys
    if (certificateFile) documents.push(certificateFile);
    if (studiedOutsideCountry && tcuFormFile) documents.push(tcuFormFile);
    
    // Create optimistic request for immediate UI feedback
    const optimisticRequest: CadreChangeRequest = {
      id: `temp-${Date.now()}`,
      employee: employeeDetails,
      submittedBy: user,
      status: 'Pending HRMO/HHRMD Review',
      reviewStage: 'initial',
      newCadre,
      reason: reasonCadreChange,
      documents,
      studiedOutsideCountry,
      createdAt: new Date().toISOString(),
    };
    
    // Add optimistic request to state for immediate feedback
    setPendingRequests(prev => [optimisticRequest, ...prev]);
    
    // Show immediate success feedback
    toast({ 
      title: "Cadre Change Request Submitted", 
      description: `Request for ${employeeDetails.name} submitted successfully. Status: Pending HRMO/HHRMD Review`,
      duration: 4000
    });
    
    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRMO/HHRMD Review',
      newCadre,
      reason: reasonCadreChange,
      documents: documents, // Store actual file object keys
      studiedOutsideCountry: studiedOutsideCountry,
    };
    
    try {
        const response = await fetch('/api/cadre-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to submit request');
        
        const result = await response.json();
        
        // Replace optimistic request with real server response
        if (result.success && result.data) {
          setPendingRequests(prev => prev.map(req => 
            req.id === optimisticRequest.id ? result.data : req
          ));
        }
        
        // Force refresh to ensure data consistency
        setTimeout(async () => {
          await fetchRequests();
        }, 1000);
        
        setZanId('');
        setEmployeeDetails(null);
        resetFormFields();
    } catch(error) {
        // Remove optimistic request on error
        setPendingRequests(prev => prev.filter(req => req.id !== optimisticRequest.id));
        toast({ title: "Submission Failed", description: "Could not submit the cadre change request.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, payload: any, actionDescription?: string) => {
      // Get request info for immediate feedback
      const request = pendingRequests.find(req => req.id === requestId);
      
      // Optimistic update - immediately show new status
      const optimisticUpdate = pendingRequests.map(req => 
        req.id === requestId 
          ? { ...req, ...payload, updatedAt: new Date().toISOString() }
          : req
      );
      setPendingRequests(optimisticUpdate);

      // Show immediate success feedback
      if (actionDescription && request) {
        toast({ 
          title: "Status Updated", 
          description: `${actionDescription} for ${request.employee.name}. Status: ${payload.status}`,
          duration: 3000 
        });
      }

      try {
          const response = await fetch(`/api/cadre-change`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: requestId, ...payload, reviewedById: user?.id })
          });
          if (!response.ok) throw new Error('Failed to update request');
          
          // Force immediate refresh to get accurate data from server
          await fetchRequests();
          return true;
      } catch (error) {
          // Revert optimistic update on error
          await fetchRequests();
          toast({ title: "Update Failed", description: "Could not update the request.", variant: "destructive" });
          return false;
      }
  };
  
  const handleInitialAction = async (requestId: string, action: 'forward' | 'reject') => {
    const request = Array.isArray(pendingRequests) ? pendingRequests.find(req => req.id === requestId) : null;
    if (!request) return;

    if (action === 'reject') {
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    } else if (action === 'forward') {
      // Both HRMO and HHRMD forward directly to Commission (parallel workflow)
      const payload = { status: "Request Received – Awaiting Commission Decision", reviewStage: 'commission_review' };
      const roleName = role === ROLES.HRMO ? 'HRMO' : 'HHRMD';
      
      await handleUpdateRequest(requestId, payload, `Request approved by ${roleName} and forwarded to Commission`);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim() || !user) return;
    const payload = { 
        status: `Rejected by ${role} - Awaiting HRO Correction`, 
        rejectionReason: rejectionReasonInput, 
        reviewStage: 'initial'
    };
    const actionDescription = "Request rejected and returned to HRO";
    
    const success = await handleUpdateRequest(currentRequestToAction.id, payload, actionDescription);
    if (success) {
      setIsRejectionModalOpen(false);
      setCurrentRequestToAction(null);
      setRejectionReasonInput('');
    }
  };

  const handleCommissionDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;
    
    const finalStatus = decision === 'approved' ? "Approved by Commission" : "Rejected by Commission - Request Concluded";
    const payload = { status: finalStatus, reviewStage: 'completed' };
    const actionDescription = decision === 'approved' 
      ? `Cadre change approved by Commission. Employee ${request.employee.name} cadre updated to "${request.newCadre}".`
      : `Cadre change rejected by Commission`;
    
    await handleUpdateRequest(requestId, payload, actionDescription);
  };

  const handleResubmit = (request: CadreChangeRequest) => {
    setRequestToCorrect(request);
    setCorrectedNewCadre(request.newCadre);
    setCorrectedReasonCadreChange(request.reason || '');
    setCorrectedStudiedOutsideCountry(request.studiedOutsideCountry || false);
    setCorrectedCertificateFile('');
    setCorrectedTcuFormFile('');
    setCorrectedLetterOfRequestFile('');
    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: CadreChangeRequest | null) => {
    if (!request || !user) return;

    if (!correctedNewCadre || !correctedReasonCadreChange || !correctedLetterOfRequestFile || (correctedStudiedOutsideCountry && !correctedTcuFormFile)) {
      toast({ title: "Submission Error", description: "All required fields and PDF documents must be provided.", variant: "destructive" });
      return;
    }

    let documents = [correctedLetterOfRequestFile]; // Store actual file keys
    if (correctedCertificateFile) documents.push(correctedCertificateFile);
    if (correctedStudiedOutsideCountry && correctedTcuFormFile) documents.push(correctedTcuFormFile);

    const payload = {
      status: 'Pending HRMO/HHRMD Review',
      reviewStage: 'initial',
      newCadre: correctedNewCadre,
      reason: correctedReasonCadreChange,
      studiedOutsideCountry: correctedStudiedOutsideCountry,
      documents: documents,
      rejectionReason: null,
    };

    // Use the optimistic update pattern
    const success = await handleUpdateRequest(request.id, payload, `Cadre change request corrected and resubmitted`);
    
    if (success) {
      setIsCorrectionModalOpen(false);
      setRequestToCorrect(null);
    }
  };

  const paginatedRequests = Array.isArray(pendingRequests) ? pendingRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) : [];


  
  return (
    <div>
      <PageHeader title="Change of Cadre" description="Process employee cadre changes." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Cadre Change Request</CardTitle>
            <CardDescription>Enter ZanID to fetch details, then complete the form. All documents must be PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdCadreChange">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdCadreChange" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
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
                      <div><Label className="text-muted-foreground">Current Cadre/Position:</Label> <p className="font-semibold text-foreground">{employeeDetails.cadre || 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeDetails.employmentDate ? format(parseISO(employeeDetails.employmentDate), 'PPP') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeDetails.dateOfBirth ? format(parseISO(employeeDetails.dateOfBirth), 'PPP') : 'N/A'}</p></div>
                      <div className="lg:col-span-1"><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{typeof employeeDetails.institution === 'object' ? employeeDetails.institution?.name : employeeDetails.institution || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                {eligibilityError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Ineligibility Notice</AlertTitle>
                    <AlertDescription>
                      {eligibilityError}
                    </AlertDescription>
                  </Alert>
                )}
            
                <div className={`space-y-4 ${!!eligibilityError ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-foreground">Cadre Change Details &amp; Documents (PDF Only)</h3>
                  <div>
                    <Label htmlFor="newCadre">Write new cadre and grade</Label>
                    <Input id="newCadre" placeholder="e.g., Senior Human Resource Officer" value={newCadre} onChange={(e) => setNewCadre(e.target.value)} disabled={isSubmitting || !!eligibilityError} />
                  </div>
                  <div>
                    <Label htmlFor="reasonCadreChange">Reason for Cadre Change &amp; Qualifications</Label>
                    <Textarea id="reasonCadreChange" placeholder="Explain the reason and list relevant qualifications" value={reasonCadreChange} onChange={(e) => setReasonCadreChange(e.target.value)} disabled={isSubmitting || !!eligibilityError} />
                  </div>
                  <FileUpload
                    label="Upload Certificate"
                    description="Upload your qualification certificate (Optional)"
                    accept=".pdf"
                    value={certificateFile}
                    onChange={setCertificateFile}
                    folder="cadre-change"
                    disabled={isSubmitting || !!eligibilityError}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox id="studiedOutsideCountryCadre" checked={studiedOutsideCountry} onCheckedChange={(checked) => setStudiedOutsideCountry(checked as boolean)} disabled={isSubmitting || !!eligibilityError} />
                    <Label htmlFor="studiedOutsideCountryCadre" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Employee studied outside the country? (Requires TCU Form)
                    </Label>
                  </div>
                  {studiedOutsideCountry && (
                    <FileUpload
                      label="Upload TCU Form"
                      description="TCU verification form is required for foreign studies"
                      accept=".pdf"
                      value={tcuFormFile}
                      onChange={setTcuFormFile}
                      folder="cadre-change"
                      disabled={isSubmitting || !!eligibilityError}
                      required
                    />
                  )}
                  <FileUpload
                    label="Upload Letter of Request"
                    description="Official letter requesting cadre change (Required)"
                    accept=".pdf"
                    value={letterOfRequestFile}
                    onChange={setLetterOfRequestFile}
                    folder="cadre-change"
                    disabled={isSubmitting || !!eligibilityError}
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button onClick={handleSubmitRequest} 
                        disabled={
                            !!eligibilityError ||
                            !employeeDetails || 
                            !newCadre || 
                            !reasonCadreChange ||
                            !letterOfRequestFile ||
                            (studiedOutsideCountry && !tcuFormFile) ||
                            isSubmitting
                        }>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
            </CardFooter>
          )}
        </Card>
      )}
      
      {role === ROLES.HRO && Array.isArray(pendingRequests) && pendingRequests.length > 0 && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Submitted Cadre Change Requests</CardTitle>
                <CardDescription>Track the status of cadre change requests you have submitted.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRequests(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {paginatedRequests.map((request) => (
              <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-base">Cadre Change for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                <p className="text-sm text-muted-foreground">From Cadre: {request.employee.cadre}</p>
                <p className="text-sm text-muted-foreground">To Cadre: {request.newCadre}</p>
                <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm"><span className="font-medium">Status:</span></p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    request.status.includes('Approved by Commission') ? 'bg-green-100 text-green-800' :
                    request.status.includes('Rejected by Commission') ? 'bg-red-100 text-red-800' :
                    request.status.includes('Awaiting Commission') ? 'bg-blue-100 text-blue-800' :
                    request.status.includes('Pending HRMO/HHRMD') ? 'bg-orange-100 text-orange-800' :
                    request.status.includes('Awaiting HRO') ? 'bg-yellow-100 text-yellow-800' :
                    request.status.includes('Correction') ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status}
                  </span>
                </div>
                {/* Workflow Progress Indicator */}
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <span>Workflow:</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        ['Pending HRMO/HHRMD Review', 'Request Received – Awaiting Commission Decision', 'Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status) 
                        ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="text-[10px]">HRO Submit</span>
                      <div className="w-3 h-px bg-gray-300"></div>
                      <div className={`w-2 h-2 rounded-full ${
                        ['Request Received – Awaiting Commission Decision', 'Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status) 
                        ? 'bg-green-500' : request.status.includes('Pending HRMO/HHRMD') ? 'bg-orange-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="text-[10px]">HRMO/HHRMD Review</span>
                      <div className="w-3 h-px bg-gray-300"></div>
                      <div className={`w-2 h-2 rounded-full ${
                        ['Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status) 
                        ? 'bg-green-500' : request.status.includes('Awaiting Commission') ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="text-[10px]">Commission Decision</span>
                    </div>
                  </div>
                </div>
                {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                  {role === ROLES.HRO && (request.status === 'Rejected by HRMO - Awaiting HRO Correction' || request.status === 'Rejected by HHRMD - Awaiting HRO Correction') && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleResubmit(request)}>
                      Correct and Resubmit
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil((Array.isArray(pendingRequests) ? pendingRequests.length : 0) / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={Array.isArray(pendingRequests) ? pendingRequests.length : 0}
              itemsPerPage={itemsPerPage}
            />
          </CardContent>
        </Card>
      )}
      
      {(role === ROLES.HHRMD || role === ROLES.HRMO) && ( 
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Cadre Change Requests</CardTitle>
                <CardDescription>Review, approve, or reject pending cadre change requests.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRequests(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">Cadre Change for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">From Cadre: {request.employee.cadre}</p>
                  <p className="text-sm text-muted-foreground">To Cadre: {request.newCadre}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'} by {request.submittedBy?.name || 'N/A'}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm"><span className="font-medium">Status:</span></p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      request.status.includes('Approved by Commission') ? 'bg-green-100 text-green-800' :
                      request.status.includes('Rejected by Commission') ? 'bg-red-100 text-red-800' :
                      request.status.includes('Awaiting Commission') ? 'bg-blue-100 text-blue-800' :
                      request.status.includes('Pending HRMO/HHRMD') ? 'bg-orange-100 text-orange-800' :
                      request.status.includes('Awaiting HRO') ? 'bg-yellow-100 text-yellow-800' :
                      request.status.includes('Correction') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  {/* Workflow Progress Indicator */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Workflow:</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          ['Pending HRMO/HHRMD Review', 'Request Received – Awaiting Commission Decision', 'Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status) 
                          ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-[10px]">HRO Submit</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          ['Request Received – Awaiting Commission Decision', 'Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status) 
                          ? 'bg-green-500' : request.status.includes('Pending HRMO/HHRMD') ? 'bg-orange-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-[10px]">HRMO/HHRMD Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          ['Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status) 
                          ? 'bg-green-500' : request.status.includes('Awaiting Commission') ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-[10px]">Commission Decision</span>
                      </div>
                    </div>
                  </div>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                    {(role === ROLES.HHRMD || role === ROLES.HRMO) && (
                      <>
                        {/* HRMO/HHRMD Parallel Review Actions */}
                        {(role === ROLES.HRMO || role === ROLES.HHRMD) && (request.status === 'Pending HRMO/HHRMD Review') && (
                          <>
                            <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify & Forward to Commission</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject & Return to HRO</Button>
                          </>
                        )}
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
              <p className="text-muted-foreground">No cadre change requests pending your review.</p>
            )}
             <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil((Array.isArray(pendingRequests) ? pendingRequests.length : 0) / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={Array.isArray(pendingRequests) ? pendingRequests.length : 0}
              itemsPerPage={itemsPerPage}
            />
          </CardContent>
        </Card>
      )}

      {selectedRequest && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                Change of Cadre request for <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
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
                        <Label className="text-right text-muted-foreground">Current Cadre:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.cadre}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Employment Date:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employee.employmentDate ? format(parseISO(selectedRequest.employee.employmentDate), 'PPP') : 'N/A'}</p>
                    </div>
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
                        <Label className="text-right font-semibold">New Cadre:</Label>
                        <p className="col-span-2">{selectedRequest.newCadre}</p>
                    </div>
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold pt-1">Reason:</Label>
                        <p className="col-span-2">{selectedRequest.reason || 'Not specified'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Studied Outside?:</Label>
                        <p className="col-span-2">{selectedRequest.studiedOutsideCountry ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Submitted:</Label>
                        <p className="col-span-2">{selectedRequest.createdAt ? format(parseISO(selectedRequest.createdAt), 'PPP') : 'N/A'} by {selectedRequest.submittedBy?.name || 'N/A'}</p>
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
                            const shortName = getShortDocumentName(objectKey);
                            return (
                                <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-foreground" title={objectKey}>{shortName}</span>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => handlePreviewFile(objectKey)}>
                                            Preview
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="h-8 px-2 text-xs"
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(`/api/files/download/${objectKey}`, {
                                                credentials: 'include'
                                              });
                                              if (response.ok) {
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = shortName;
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
                                        >
                                          Download
                                        </Button>
                                        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => {
                                            const token = localStorage.getItem('accessToken');
                                            if (token) {
                                              fetch(`/api/files/download/${objectKey}`, {
                                                headers: {
                                                  'Authorization': `Bearer ${token}`
                                                }
                                              })
                                              .then(response => {
                                                if (!response.ok) {
                                                  throw new Error('Download failed');
                                                }
                                                return response.blob();
                                              })
                                              .then(blob => {
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                const filename = objectKey.split('/').pop() || 'document.pdf';
                                                a.download = filename;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                              })
                                              .catch(error => {
                                                console.error('Download error:', error);
                                                toast({
                                                  title: 'Download Error',
                                                  description: 'Failed to download file',
                                                  variant: 'destructive'
                                                });
                                              });
                                            } else {
                                              toast({
                                                title: 'Authorization Error',
                                                description: 'You do not have permission to download this file',
                                                variant: 'destructive'
                                              });
                                            }
                                        }}>
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reject Cadre Change Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the cadre change request for <strong>{currentRequestToAction.employee.name}</strong>. This reason will be visible to the HRO.
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
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correct & Resubmit Cadre Change Request</DialogTitle>
              <DialogDescription>
                Please update the details and upload corrected documents for <strong>{requestToCorrect.employee.name}</strong> (ZanID: {requestToCorrect.employee.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Update the cadre details and re-attach all required PDF documents, even if only one needed correction.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="correctedNewCadre">Write new cadre and grade</Label>
                  <Input 
                    id="correctedNewCadre" 
                    placeholder="e.g., Senior Human Resource Officer" 
                    value={correctedNewCadre} 
                    onChange={(e) => setCorrectedNewCadre(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="correctedReasonCadreChange">Reason for Cadre Change & Qualifications</Label>
                  <Textarea 
                    id="correctedReasonCadreChange" 
                    placeholder="Explain the reason and list relevant qualifications" 
                    value={correctedReasonCadreChange} 
                    onChange={(e) => setCorrectedReasonCadreChange(e.target.value)} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="correctedStudiedOutsideCountry" 
                    checked={correctedStudiedOutsideCountry} 
                    onCheckedChange={(checked) => setCorrectedStudiedOutsideCountry(checked as boolean)} 
                  />
                  <Label htmlFor="correctedStudiedOutsideCountry" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Employee studied outside the country? (Requires TCU Form)
                  </Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-base">Required Documents (PDF Only)</h4>
                <FileUpload
                  label="Upload Certificate"
                  description="Upload your qualification certificate (Optional)"
                  accept=".pdf"
                  value={correctedCertificateFile}
                  onChange={setCorrectedCertificateFile}
                  folder="cadre-change"
                />
                {correctedStudiedOutsideCountry && (
                  <FileUpload
                    label="Upload TCU Form"
                    description="TCU verification form is required for foreign studies"
                    accept=".pdf"
                    value={correctedTcuFormFile}
                    onChange={setCorrectedTcuFormFile}
                    folder="cadre-change"
                    required
                  />
                )}
                <FileUpload
                  label="Upload Letter of Request"
                  description="Official letter requesting cadre change (Required)"
                  accept=".pdf"
                  value={correctedLetterOfRequestFile}
                  onChange={setCorrectedLetterOfRequestFile}
                  folder="cadre-change"
                  required
                />
              </div>
              
              {requestToCorrect.rejectionReason && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <Label className="font-semibold text-destructive">Previous Rejection Reason:</Label>
                  <p className="text-sm text-destructive mt-1">{requestToCorrect.rejectionReason}</p>
                </div>
              )}
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

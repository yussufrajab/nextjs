
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, CalendarDays, ListFilter, Stethoscope, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { addMonths, format, isBefore, differenceInYears, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { useAuthStore } from '@/store/auth-store';

interface RetirementRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  createdAt: string;
  
  retirementType: string;
  illnessDescription?: string | null;
  proposedDate: string;
  delayReason?: string | null;
  documents: string[];
}

const COMPULSORY_RETIREMENT_AGE = 60;
const VOLUNTARY_RETIREMENT_AGE = 55;

export default function RetirementPage() {
  const { role, user } = useAuth();
  const { accessToken } = useAuthStore();
  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [retirementType, setRetirementType] = useState('');
  const [retirementDate, setRetirementDate] = useState('');
  const [illnessDescription, setIllnessDescription] = useState('');
  const [medicalFormFile, setMedicalFormFile] = useState<string>('');
  const [illnessLeaveLetterFile, setIllnessLeaveLetterFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');
  const [minRetirementDate, setMinRetirementDate] = useState('');
  const [ageEligibilityError, setAgeEligibilityError] = useState<string | null>(null);

  const [delayReason, setDelayReason] = useState('');
  const [delayDocumentFile, setDelayDocumentFile] = useState<string>('');
  const [showDelayFields, setShowDelayFields] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<RetirementRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RetirementRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<RetirementRequest | null>(null);

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<RetirementRequest | null>(null);
  const [correctedRetirementType, setCorrectedRetirementType] = useState('');
  const [correctedRetirementDate, setCorrectedRetirementDate] = useState('');
  const [correctedIllnessDescription, setCorrectedIllnessDescription] = useState('');
  const [correctedDelayReason, setCorrectedDelayReason] = useState('');
  const [correctedMedicalFormFile, setCorrectedMedicalFormFile] = useState<string>('');
  const [correctedIllnessLeaveLetterFile, setCorrectedIllnessLeaveLetterFile] = useState<string>('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] = useState<string>('');
  const [correctedDelayDocumentFile, setCorrectedDelayDocumentFile] = useState<string>('');
  const [correctedAgeEligibilityError, setCorrectedAgeEligibilityError] = useState<string | null>(null);
  const [showCorrectedDelayFields, setShowCorrectedDelayFields] = useState(false);

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

  useEffect(() => {
    const sixMonthsFromNow = addMonths(new Date(), 6);
    setMinRetirementDate(format(sixMonthsFromNow, 'yyyy-MM-dd'));
  }, []);

  const fetchRequests = async () => {
    if (!user || !role) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/retirement?userId=${user.id}&userRole=${role}&userInstitutionId=${user.institutionId || ''}`);
      if (!response.ok) throw new Error('Failed to fetch retirement requests');
      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      toast({ title: "Error", description: "Could not load retirement requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, role]);

  useEffect(() => {
    setAgeEligibilityError(null);
    setShowDelayFields(false);

    if (employeeDetails && employeeDetails.dateOfBirth && retirementType && retirementDate) {
      const birthDate = parseISO(employeeDetails.dateOfBirth);
      const proposedRetirementDate = parseISO(retirementDate);
      const ageAtRetirement = differenceInYears(proposedRetirementDate, birthDate);

      if (retirementType === 'compulsory') {
        if (ageAtRetirement > COMPULSORY_RETIREMENT_AGE) {
          setShowDelayFields(true);
        } else if (ageAtRetirement < COMPULSORY_RETIREMENT_AGE) {
          setAgeEligibilityError(`Employee will be ${ageAtRetirement} and not meet the compulsory retirement age (${COMPULSORY_RETIREMENT_AGE}) by the proposed date.`);
        }
      } else if (retirementType === 'voluntary') {
        if (ageAtRetirement >= COMPULSORY_RETIREMENT_AGE) {
          setAgeEligibilityError(`Employee is aged ${ageAtRetirement} and qualifies for compulsory retirement. Please select 'Compulsory (Age 60)' as the retirement type.`);
        } else if (ageAtRetirement < VOLUNTARY_RETIREMENT_AGE) {
          setAgeEligibilityError(`Employee will be ${ageAtRetirement} and not meet the voluntary retirement age (${VOLUNTARY_RETIREMENT_AGE}) by the proposed date.`);
        }
      }
    }
  }, [employeeDetails, retirementType, retirementDate]);

  // Validation for corrected retirement date in correction modal
  useEffect(() => {
    setCorrectedAgeEligibilityError(null);
    setShowCorrectedDelayFields(false);

    if (requestToCorrect && requestToCorrect.employee.dateOfBirth && correctedRetirementType && correctedRetirementDate) {
      const birthDate = parseISO(requestToCorrect.employee.dateOfBirth);
      const proposedRetirementDate = parseISO(correctedRetirementDate);
      const ageAtRetirement = differenceInYears(proposedRetirementDate, birthDate);

      if (correctedRetirementType === 'compulsory') {
        if (ageAtRetirement > COMPULSORY_RETIREMENT_AGE) {
          setShowCorrectedDelayFields(true);
        } else if (ageAtRetirement < COMPULSORY_RETIREMENT_AGE) {
          setCorrectedAgeEligibilityError(`Employee will be ${ageAtRetirement} and not meet the compulsory retirement age (${COMPULSORY_RETIREMENT_AGE}) by the proposed date.`);
        }
      } else if (correctedRetirementType === 'voluntary') {
        if (ageAtRetirement >= COMPULSORY_RETIREMENT_AGE) {
          setCorrectedAgeEligibilityError(`Employee is aged ${ageAtRetirement} and qualifies for compulsory retirement. Please select 'Compulsory (Age 60)' as the retirement type.`);
        } else if (ageAtRetirement < VOLUNTARY_RETIREMENT_AGE) {
          setCorrectedAgeEligibilityError(`Employee will be ${ageAtRetirement} and not meet the voluntary retirement age (${VOLUNTARY_RETIREMENT_AGE}) by the proposed date.`);
        }
      }
    }
  }, [requestToCorrect, correctedRetirementType, correctedRetirementDate]);

  const resetFormFields = () => {
    setRetirementType('');
    setRetirementDate('');
    setIllnessDescription('');
    setMedicalFormFile('');
    setIllnessLeaveLetterFile('');
    setLetterOfRequestFile('');
    setAgeEligibilityError(null);
    setDelayReason('');
    setDelayDocumentFile('');
    setShowDelayFields(false);
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
        console.log(`[RETIREMENT] Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`[RETIREMENT] Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[RETIREMENT] API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        console.log(`[RETIREMENT] Found employee: ${foundEmployee.name}`); // Debug log

        setEmployeeDetails(foundEmployee);
        if (!foundEmployee.dateOfBirth) {
            toast({ title: "Missing Information", description: "Employee date of birth is missing. Age validation cannot be performed.", variant: "warning", duration: 5000 });
        }
        toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded successfully.` });
    } catch (error: any) {
        console.error(`[RETIREMENT] Search failed:`, error); // Debug log
        const errorMessage = error.message || `No employee found with ZanID: ${cleanZanId}.`;
        toast({ title: "Employee Not Found", description: errorMessage, variant: "destructive" });
    } finally {
        setIsFetchingEmployee(false);
    }
  };

  const handleSubmitRetirementRequest = async () => {
    if (!employeeDetails || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }
    
    // Validation checks
    if (!retirementType) {
      toast({ title: "Submission Error", description: "Please select a retirement type.", variant: "destructive" });
      return;
    }
    
    if (!retirementDate) {
      toast({ title: "Submission Error", description: "Please select a retirement date.", variant: "destructive" });
      return;
    }
    
    if (!letterOfRequestFile) {
      toast({ title: "Submission Error", description: "Please upload the letter of request.", variant: "destructive" });
      return;
    }
    
    if (retirementType === 'illness') {
      if (!medicalFormFile) {
        toast({ title: "Submission Error", description: "Please upload the medical form for illness retirement.", variant: "destructive" });
        return;
      }
      if (!illnessDescription) {
        toast({ title: "Submission Error", description: "Please describe the illness.", variant: "destructive" });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    // Build the documents array with object keys
    const documentObjectKeys: string[] = [];
    if (letterOfRequestFile) documentObjectKeys.push(letterOfRequestFile);
    
    if (retirementType === 'illness') {
        if (medicalFormFile) documentObjectKeys.push(medicalFormFile);
        if (illnessLeaveLetterFile) documentObjectKeys.push(illnessLeaveLetterFile);
    }
    // For compulsory and voluntary retirement, only letter of request is required
    // Birth certificate and service record files are not implemented in the UI
    
    if (showDelayFields && delayDocumentFile) {
        documentObjectKeys.push(delayDocumentFile);
    }

    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRMO/HHRMD Review',
      retirementType: retirementType,
      illnessDescription: retirementType === 'illness' ? illnessDescription : undefined,
      delayReason: showDelayFields ? delayReason : undefined,
      proposedDate: new Date(retirementDate).toISOString(),
      documents: documentObjectKeys,
    };
    
    console.log('[RETIREMENT] Submission payload:', payload);
    console.log('[RETIREMENT] Document keys:', documentObjectKeys);
    
    try {
        const response = await fetch('/api/retirement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to submit request');
        
        await fetchRequests(); // Refresh list
        toast({ title: "Retirement Request Submitted", description: `Request for ${employeeDetails.name} submitted successfully.` });
        setZanId('');
        setEmployeeDetails(null);
        resetFormFields();
    } catch(error) {
        toast({ title: "Submission Failed", description: "Could not submit the retirement request.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isSubmitDisabled = 
    !employeeDetails || 
    !retirementType || 
    !retirementDate || 
    letterOfRequestFile === '' || 
    (retirementType === 'illness' && (medicalFormFile === '' || illnessLeaveLetterFile === '' || !illnessDescription)) || 
    (showDelayFields && (!delayReason.trim() || delayDocumentFile === '')) ||
    (ageEligibilityError && !showDelayFields) ||
    isSubmitting;
  
  const handleUpdateRequest = async (requestId: string, payload: any) => {
    try {
        const response = await fetch(`/api/retirement`, {
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

  const handleResubmit = (request: RetirementRequest) => {
    setRequestToCorrect(request);
    setCorrectedRetirementType(request.retirementType);
    setCorrectedRetirementDate(request.proposedDate);
    setCorrectedIllnessDescription(request.illnessDescription || '');
    setCorrectedDelayReason(request.delayReason || '');
    setCorrectedMedicalFormFile('');
    setCorrectedIllnessLeaveLetterFile('');
    setCorrectedLetterOfRequestFile('');
    setCorrectedDelayDocumentFile('');
    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: RetirementRequest | null) => {
    if (!request || !user) return;

    // Basic validation
    if (!correctedRetirementType || !correctedRetirementDate || !correctedLetterOfRequestFile) {
      toast({ title: "Submission Error", description: "All required fields and documents must be provided.", variant: "destructive" });
      return;
    }

    // Check age eligibility error
    if (correctedAgeEligibilityError) {
      toast({ title: "Eligibility Error", description: correctedAgeEligibilityError, variant: "destructive" });
      return;
    }

    // Additional validation for illness type
    if (correctedRetirementType === 'illness' && !correctedMedicalFormFile) {
      toast({ title: "Submission Error", description: "Medical form is required for illness retirement.", variant: "destructive" });
      return;
    }

    try {
      // Build the corrected documents array with object keys
      const correctedDocumentObjectKeys: string[] = [];
      if (correctedLetterOfRequestFile) correctedDocumentObjectKeys.push(correctedLetterOfRequestFile);
      
      if (correctedRetirementType === 'illness') {
        if (correctedMedicalFormFile) correctedDocumentObjectKeys.push(correctedMedicalFormFile);
        if (correctedIllnessLeaveLetterFile) correctedDocumentObjectKeys.push(correctedIllnessLeaveLetterFile);
      }
      
      if (correctedDelayDocumentFile) correctedDocumentObjectKeys.push(correctedDelayDocumentFile);

      // Convert date string to ISO-8601 DateTime format
      const proposedDateTime = new Date(correctedRetirementDate).toISOString();
      
      const payload = {
        status: 'Pending HRMO/HHRMD Review',
        reviewStage: 'initial',
        retirementType: correctedRetirementType,
        proposedDate: proposedDateTime,
        illnessDescription: correctedRetirementType === 'illness' ? correctedIllnessDescription : null,
        delayReason: correctedDelayReason || null,
        documents: correctedDocumentObjectKeys,
        rejectionReason: null,
        reviewedById: user.id
      };

      const response = await fetch(`/api/retirement`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({id: request.id, ...payload}),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resubmit error:', errorData);
        throw new Error('Failed to resubmit retirement request');
      }

      toast({ title: "Success", description: `Retirement request for ${request.employee.name} resubmitted successfully.` });
      setIsCorrectionModalOpen(false);
      setRequestToCorrect(null);
      await fetchRequests();
    } catch (error) {
      console.error("[RESUBMIT_RETIREMENT]", error);
      toast({ title: "Error", description: "Failed to resubmit retirement request.", variant: "destructive" });
    }
  };

  const paginatedRequests = pendingRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <PageHeader title="Retirement" description="Manage employee retirement processes." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Retirement Request</CardTitle>
            <CardDescription>Enter ZanID, then fill retirement details and upload required PDF documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdRetirement">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdRetirement" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
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

                 {ageEligibilityError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Eligibility Error</AlertTitle>
                    <AlertDescription>{ageEligibilityError}</AlertDescription>
                  </Alert>
                )}

                <div className={`space-y-4 ${ageEligibilityError && !showDelayFields ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-foreground">Retirement Details &amp; Documents (PDF Only)</h3>
                  <div>
                    <Label htmlFor="retirementType" className="flex items-center"><ListFilter className="mr-2 h-4 w-4 text-primary" />Retirement Type</Label>
                    <Select value={retirementType} onValueChange={setRetirementType} disabled={isSubmitting || (ageEligibilityError && !showDelayFields)}>
                      <SelectTrigger id="retirementTypeTrigger">
                        <SelectValue placeholder="Select retirement type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compulsory">Compulsory (Age 60)</SelectItem>
                        <SelectItem value="voluntary">Voluntary (Age 55+)</SelectItem>
                        <SelectItem value="illness">Illness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="retirementDate" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" />Proposed Retirement Date</Label>
                    <Input id="retirementDate" type="date" value={retirementDate} onChange={(e) => setRetirementDate(e.target.value)} disabled={isSubmitting || (ageEligibilityError && !showDelayFields)} min={minRetirementDate} />
                  </div>
                  
                  {retirementType === 'illness' && (
                    <>
                      <div>
                        <Label htmlFor="illnessDescription">Type of Illness</Label>
                        <Textarea 
                          id="illnessDescription" 
                          placeholder="Describe the illness as per the medical report" 
                          value={illnessDescription} 
                          onChange={(e) => setIllnessDescription(e.target.value)} 
                          disabled={isSubmitting || (ageEligibilityError && !showDelayFields)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="medicalFormFile" className="flex items-center"><Stethoscope className="mr-2 h-4 w-4 text-primary" />Upload Medical Form (Required, PDF Only)</Label>
                        <FileUpload
                          folder="retirement"
                          value={medicalFormFile}
                          onChange={setMedicalFormFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting || (ageEligibilityError && !showDelayFields)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="illnessLeaveLetterFile" className="flex items-center"><ClipboardCheck className="mr-2 h-4 w-4 text-primary" />Upload Leave Due to Illness Letter (Required, PDF Only)</Label>
                        <FileUpload
                          folder="retirement"
                          value={illnessLeaveLetterFile}
                          onChange={setIllnessLeaveLetterFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting || (ageEligibilityError && !showDelayFields)}
                          required
                        />
                      </div>
                    </>
                  )}
                  
                  {showDelayFields && (
                    <div className="space-y-4 pt-2 border-t border-yellow-300">
                      <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-800">
                        <AlertTriangle className="h-4 w-4 !text-yellow-800" />
                        <AlertTitle>Delayed Compulsory Retirement</AlertTitle>
                        <AlertDescription>
                          This employee is over {COMPULSORY_RETIREMENT_AGE}. Please provide a reason for the delay and upload a supporting document.
                        </AlertDescription>
                      </Alert>
                      <div>
                        <Label htmlFor="delayReason">Reason for Delay</Label>
                        <Textarea
                          id="delayReason"
                          placeholder="e.g., The employee was granted a service extension."
                          value={delayReason}
                          onChange={(e) => setDelayReason(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="delayDocumentFile" className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-primary" />
                          Upload Supporting Document for Delay (e.g., Extension Letter) (Required, PDF Only)
                        </Label>
                        <FileUpload
                          folder="retirement"
                          value={delayDocumentFile}
                          onChange={setDelayDocumentFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="letterOfRequestRetirement" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request (Required, PDF Only)</Label>
                    <FileUpload
                      folder="retirement"
                      value={letterOfRequestFile}
                      onChange={setLetterOfRequestFile}
                      onPreview={handlePreviewFile}
                      disabled={isSubmitting || (ageEligibilityError && !showDelayFields)}
                      required
                    />
                  </div>
                   <p className="text-xs text-muted-foreground">
                    Note: Proposed retirement date must be at least 6 months from today. Age validation is based on the proposed retirement date.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button 
                onClick={handleSubmitRetirementRequest} 
                disabled={isSubmitDisabled}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Retirement Request
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
      
      {role === ROLES.HRO && pendingRequests.length > 0 && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Your Submitted Retirement Requests</CardTitle>
            <CardDescription>Track the status of retirement requests you have submitted.</CardDescription>
          </CardHeader>
          <CardContent>
            {paginatedRequests.map((request) => (
              <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-base">Retirement Request for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                <p className="text-sm text-muted-foreground">Type: {request.retirementType}</p>
                <p className="text-sm text-muted-foreground">Proposed Date: {request.proposedDate ? format(parseISO(request.proposedDate), 'PPP') : 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
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
              totalPages={Math.ceil(pendingRequests.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={pendingRequests.length}
              itemsPerPage={itemsPerPage}
            />
          </CardContent>
        </Card>
      )}

      {(role === ROLES.HHRMD || role === ROLES.HRMO) && ( 
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Review Retirement Requests</CardTitle>
            <CardDescription>Review, approve, or reject pending retirement requests.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">Retirement Request for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Type: {request.retirementType}</p>
                  <p className="text-sm text-muted-foreground">Proposed Date: {request.proposedDate ? format(parseISO(request.proposedDate), 'PPP') : 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'} by {request.submittedBy.name}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
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
              <p className="text-muted-foreground">No retirement requests pending your review.</p>
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
                Retirement request for <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
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
                        <Label className="text-right font-semibold">Retirement Type:</Label>
                        <p className="col-span-2">{selectedRequest.retirementType}</p>
                    </div>
                    {selectedRequest.retirementType === 'Illness' && selectedRequest.illnessDescription && (
                        <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold pt-1">Type of Illness:</Label>
                            <p className="col-span-2">{selectedRequest.illnessDescription}</p>
                        </div>
                    )}
                    {selectedRequest.delayReason && (
                        <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold text-yellow-700 pt-1">Reason for Delay:</Label>
                            <p className="col-span-2">{selectedRequest.delayReason}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Proposed Date:</Label>
                        <p className="col-span-2">{selectedRequest.proposedDate ? format(parseISO(selectedRequest.proposedDate), 'PPP') : 'N/A'}</p>
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
                    <DialogTitle>Reject Retirement Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the retirement request for <strong>{currentRequestToAction.employee.name}</strong>. This reason will be visible to the HRO.
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
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correct & Resubmit Retirement Request</DialogTitle>
              <DialogDescription>
                Please update the details and upload corrected documents for <strong>{requestToCorrect.employee.name}</strong> (ZanID: {requestToCorrect.employee.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Update the retirement details and re-attach all required PDF documents, even if only one needed correction.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="correctedRetirementType">Retirement Type</Label>
                  <Select value={correctedRetirementType} onValueChange={setCorrectedRetirementType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select retirement type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compulsory">Compulsory (Age 60)</SelectItem>
                      <SelectItem value="voluntary">Voluntary (Age 55+)</SelectItem>
                      <SelectItem value="illness">Medical/Illness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="correctedRetirementDate">Proposed Retirement Date</Label>
                  <Input 
                    id="correctedRetirementDate" 
                    type="date" 
                    value={correctedRetirementDate} 
                    onChange={(e) => setCorrectedRetirementDate(e.target.value)}
                    min={minRetirementDate}
                  />
                </div>

                {correctedAgeEligibilityError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Age Eligibility Error</AlertTitle>
                    <AlertDescription>
                      {correctedAgeEligibilityError}
                    </AlertDescription>
                  </Alert>
                )}

                {correctedRetirementType === 'illness' && (
                  <div>
                    <Label htmlFor="correctedIllnessDescription">Illness Description</Label>
                    <Textarea 
                      id="correctedIllnessDescription" 
                      placeholder="Describe the illness/medical condition" 
                      value={correctedIllnessDescription} 
                      onChange={(e) => setCorrectedIllnessDescription(e.target.value)} 
                    />
                  </div>
                )}

                {showCorrectedDelayFields && (
                  <div>
                    <Label htmlFor="correctedDelayReason">Delay Reason (Required for retirement beyond age 60)</Label>
                    <Textarea 
                      id="correctedDelayReason" 
                      placeholder="Explain reason for delay beyond age 60" 
                      value={correctedDelayReason} 
                      onChange={(e) => setCorrectedDelayReason(e.target.value)} 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-base">Required Documents (PDF Only)</h4>
                <div>
                  <Label htmlFor="correctedLetterOfRequestFile" className="flex items-center mb-1">
                    <FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request (Required)
                  </Label>
                  <Input id="correctedLetterOfRequestFile" type="file" onChange={(e) => setCorrectedLetterOfRequestFile(e.target.files)} accept=".pdf" />
                </div>
                
                {correctedRetirementType === 'illness' && (
                  <>
                    <div>
                      <Label htmlFor="correctedMedicalFormFile" className="flex items-center mb-1">
                        <Stethoscope className="mr-2 h-4 w-4 text-primary" />Upload Medical Form (Required)
                      </Label>
                      <Input id="correctedMedicalFormFile" type="file" onChange={(e) => setCorrectedMedicalFormFile(e.target.files)} accept=".pdf" />
                    </div>
                    <div>
                      <Label htmlFor="correctedIllnessLeaveLetterFile" className="flex items-center mb-1">
                        <FileText className="mr-2 h-4 w-4 text-primary" />Upload Illness Leave Letter (Optional)
                      </Label>
                      <Input id="correctedIllnessLeaveLetterFile" type="file" onChange={(e) => setCorrectedIllnessLeaveLetterFile(e.target.files)} accept=".pdf" />
                    </div>
                  </>
                )}

                {showCorrectedDelayFields && (
                  <div>
                    <Label htmlFor="correctedDelayDocumentFile" className="flex items-center mb-1">
                      <ClipboardCheck className="mr-2 h-4 w-4 text-primary" />Upload Delay Document (Optional)
                    </Label>
                    <Input id="correctedDelayDocumentFile" type="file" onChange={(e) => setCorrectedDelayDocumentFile(e.target.files)} accept=".pdf" />
                  </div>
                )}
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

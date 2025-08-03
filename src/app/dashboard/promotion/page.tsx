'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import React, { useState, useEffect, useMemo } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, Award, ChevronsUpDown, ListFilter, Star, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { format, parseISO, differenceInYears } from 'date-fns';


interface PromotionRequest {
  id: string;
  employee: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  reviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  commissionDecisionDate?: string | null;
  commissionDecisionReason?: string | null;
  createdAt: string;

  proposedCadre: string;
  promotionType: 'Experience' | 'EducationAdvancement';
  documents: string[];
  studiedOutsideCountry?: boolean | null;
}

export default function PromotionPage() {
  const { role, user } = useAuth();

  const [pendingRequests, setPendingRequests] = useState<PromotionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PromotionRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return pendingRequests.slice(startIndex, endIndex);
  }, [pendingRequests, currentPage, itemsPerPage]);


  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [promotionRequestType, setPromotionRequestType] = useState<'experience' | 'education' | ''>('');
  const [proposedCadre, setProposedCadre] = useState('');

  // Experience-based promotion files
  const [performanceAppraisalFileY1, setPerformanceAppraisalFileY1] = useState<string>('');
  const [performanceAppraisalFileY2, setPerformanceAppraisalFileY2] = useState<string>('');
  const [performanceAppraisalFileY3, setPerformanceAppraisalFileY3] = useState<string>('');
  const [cscPromotionFormFile, setCscPromotionFormFile] = useState<string>('');

  // Education-based promotion files
  const [certificateFile, setCertificateFile] = useState<string>('');
  const [studiedOutsideCountry, setStudiedOutsideCountry] = useState(false);
  const [tcuFormFile, setTcuFormFile] = useState<string>('');
  
  // Common file
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  // Debug file uploads
  const handleFileUpload = (setter: (value: string) => void, fileName: string) => {
    return (objectKey: string) => {
      console.log(`File uploaded - ${fileName}:`, objectKey);
      setter(objectKey);
    };
  };

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
  const [currentRequestToAction, setCurrentRequestToAction] = useState<PromotionRequest | null>(null);
  const [isEditingExistingRequest, setIsEditingExistingRequest] = useState(false);
  const [isCommissionRejection, setIsCommissionRejection] = useState(false);

  const [eligibilityError, setEligibilityError] = useState<string | null>(null);



  const handleResubmitClick = (request: PromotionRequest) => {
    setSelectedRequest(request);
    setIsEditingExistingRequest(true);
    setZanId(request.employee.zanId || '');
    setEmployeeDetails(request.employee as Employee);
    setPromotionRequestType(request.promotionType.toLowerCase() as 'experience' | 'education' | '');
    setProposedCadre(request.proposedCadre);
    setStudiedOutsideCountry(request.studiedOutsideCountry || false);
    // Note: File inputs cannot be pre-filled for security reasons.
    // The user will need to re-upload documents if changes are required.
  };

  const fetchRequests = async () => {
    if (!user || !role) return;
    setIsLoading(true);
    try {
        const response = await fetch(`/api/promotions?userId=${user.id}&userRole=${role}&userInstitutionId=${user.institutionId || ''}`);
        if (!response.ok) throw new Error('Failed to fetch promotion requests');
        const result = await response.json();
        setPendingRequests(result.data || []);
    } catch (error) {
        toast({ title: "Error", description: "Could not load promotion requests.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, role]);

  const resetFormFields = () => {
    setPromotionRequestType('');
    setProposedCadre('');
    setPerformanceAppraisalFileY1('');
    setPerformanceAppraisalFileY2('');
    setPerformanceAppraisalFileY3('');
    setCscPromotionFormFile('');
    setCertificateFile('');
    setStudiedOutsideCountry(false);
    setTcuFormFile('');
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
    setEligibilityError(null);

    try {
        console.log(`[PROMOTION] Searching for employee with ZanID: ${cleanZanId}`); // Debug log
        const response = await fetch(`/api/employees/search?zanId=${cleanZanId}`);
        
        console.log(`[PROMOTION] Response status: ${response.status}`); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PROMOTION] API Error: ${errorText}`); // Debug log
            throw new Error(errorText || "Employee not found");
        }
        
        const result = await response.json();
        console.log(`[PROMOTION] API result:`, result); // Debug log
        
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        
        const foundEmployee: Employee = result.data[0];
        console.log(`[PROMOTION] Found employee: ${foundEmployee.name}`); // Debug log

        let error = null;
        if (foundEmployee.status === 'On Probation' || foundEmployee.status === 'On LWOP') {
          error = `Employee is currently '${foundEmployee.status}' and is not eligible for promotion.`;
        } else if (foundEmployee.employmentDate) {
          const yearsOfService = differenceInYears(new Date(), parseISO(foundEmployee.employmentDate.toString()));
          if (yearsOfService < 3) {
            error = `Employee must have at least 3 years of service for promotion. Current service: ${yearsOfService} years.`;
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
        console.error(`[PROMOTION] Search failed:`, error); // Debug log
        const errorMessage = error.message || `No employee found with ZanID: ${cleanZanId}.`;
        toast({ title: "Employee Not Found", description: errorMessage, variant: "destructive" });
    } finally {
        setIsFetchingEmployee(false);
    }
  };

  const handleSubmitPromotionRequest = async () => {
    if (!!eligibilityError) {
      toast({ title: "Submission Error", description: "This employee is ineligible for promotion.", variant: "destructive" });
      return;
    }
    if (!employeeDetails || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    let documentsList: string[] = [letterOfRequestFile];
    if (promotionRequestType === 'experience') {
      documentsList.push(performanceAppraisalFileY1, performanceAppraisalFileY2, performanceAppraisalFileY3, cscPromotionFormFile);
    } else if (promotionRequestType === 'education') {
      documentsList.push(certificateFile);
      if (studiedOutsideCountry && tcuFormFile) documentsList.push(tcuFormFile);
    }

    const method = isEditingExistingRequest ? 'PATCH' : 'POST';
    const url = isEditingExistingRequest ? `/api/promotions` : '/api/promotions';
    const payload = {
      ...(isEditingExistingRequest && { id: selectedRequest?.id }),
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRMO/HHRMD Review', // Both roles can review in parallel
      reviewStage: 'initial',
      proposedCadre,
      promotionType: promotionRequestType === 'experience' ? 'Experience' : 'EducationAdvancement',
      documents: documentsList,
      studiedOutsideCountry: promotionRequestType === 'education' ? studiedOutsideCountry : undefined,
      rejectionReason: null, // Clear rejection reason on resubmission
    };
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to submit/update request');
        
        await fetchRequests(); // Refresh list
        toast({ title: "Promotion Request " + (isEditingExistingRequest ? "Updated" : "Submitted"), description: `Request for ${employeeDetails.name} ` + (isEditingExistingRequest ? "updated" : "submitted") + ` successfully.` });
        setZanId('');
        setEmployeeDetails(null);
        resetFormFields();
        setIsEditingExistingRequest(false);
        setSelectedRequest(null);
    } catch(error) {
        toast({ title: "Submission Failed", description: "Could not submit/update the promotion request.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleUpdateRequest = async (requestId: string, payload: any) => {
      try {
          const response = await fetch(`/api/promotions`, {
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

  const isSubmitDisabled = () => {
    // Basic validation
    const basicValidation = !!eligibilityError || isSubmitting || !employeeDetails || !promotionRequestType || letterOfRequestFile === '';
    if (basicValidation) {
      console.log('Basic validation failed:', { eligibilityError, isSubmitting, hasEmployee: !!employeeDetails, promotionRequestType, letterOfRequestFile });
      return true;
    }
    
    // Experience-based validation
    if (promotionRequestType === 'experience') {
      const experienceValidation = !proposedCadre || performanceAppraisalFileY1 === '' || performanceAppraisalFileY2 === '' || performanceAppraisalFileY3 === '' || cscPromotionFormFile === '';
      console.log('Experience validation:', { proposedCadre, performanceAppraisalFileY1, performanceAppraisalFileY2, performanceAppraisalFileY3, cscPromotionFormFile, failed: experienceValidation });
      return experienceValidation;
    }
    
    // Education-based validation
    if (promotionRequestType === 'education') {
      const educationValidation = certificateFile === '' || (studiedOutsideCountry && tcuFormFile === '');
      console.log('Education validation:', { certificateFile, studiedOutsideCountry, tcuFormFile, failed: educationValidation });
      return educationValidation;
    }
    
    console.log('All validations passed, button should be enabled');
    return false; 
  };

  // Debug logging for button state
  console.log('Promotion submit button state:', {
    hasEmployee: !!employeeDetails,
    promotionRequestType,
    proposedCadre,
    letterOfRequestFile,
    letterOfRequestFileLength: letterOfRequestFile.length,
    performanceAppraisalFileY1,
    performanceAppraisalFileY1Length: performanceAppraisalFileY1.length,
    performanceAppraisalFileY2,
    performanceAppraisalFileY2Length: performanceAppraisalFileY2.length,
    performanceAppraisalFileY3,
    performanceAppraisalFileY3Length: performanceAppraisalFileY3.length,
    cscPromotionFormFile,
    cscPromotionFormFileLength: cscPromotionFormFile.length,
    certificateFile,
    certificateFileLength: certificateFile.length,
    tcuFormFile,
    tcuFormFileLength: tcuFormFile.length,
    studiedOutsideCountry,
    eligibilityError,
    isSubmitting,
    isDisabled: isSubmitDisabled()
  });

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
    
    let payload;
    if (isCommissionRejection) {
      // Commission rejection - final, no corrections possible
      payload = { 
        status: 'Rejected by Commission - Request Concluded',
        reviewStage: 'completed',
        commissionDecisionReason: rejectionReasonInput
      };
    } else {
      // HRMO/HHRMD rejection - allows HRO correction
      payload = { 
        status: `Rejected by ${role} - Awaiting HRO Correction`, 
        rejectionReason: rejectionReasonInput, 
        reviewStage: 'initial'
      };
    }
    
    const success = await handleUpdateRequest(currentRequestToAction.id, payload);
    if (success) {
      const title = isCommissionRejection ? "Commission Decision: Rejected" : "Request Rejected";
      const description = isCommissionRejection 
        ? `Promotion request for ${currentRequestToAction.employee.name} has been rejected by the Commission.`
        : `Request for ${currentRequestToAction.employee.name} rejected and returned for correction.`;
      toast({ title, description, variant: 'destructive' });
      setIsRejectionModalOpen(false);
      setCurrentRequestToAction(null);
      setRejectionReasonInput('');
      setIsCommissionRejection(false);
    }
  };

  const handleCommissionDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;
    
    if (decision === 'rejected') {
      // Show modal to enter commission decision reason
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
      // Set a flag to indicate this is a commission rejection
      setIsCommissionRejection(true);
    } else {
      // For approval, also ask for reason
      const reason = prompt('Please provide the reason for approval:');
      if (!reason || !reason.trim()) {
        toast({ title: "Reason Required", description: "Commission must provide a reason for the decision.", variant: "destructive" });
        return;
      }
      
      const finalStatus = "Approved by Commission";
      const payload = { 
        status: finalStatus, 
        reviewStage: 'completed',
        commissionDecisionReason: reason
      };
      const success = await handleUpdateRequest(requestId, payload);
      if (success) {
        const title = `Commission Decision: Approved`;
        const description = `Promotion approved. Employee ${request?.employee.name} rank updated to "${request?.proposedCadre}".`;
        toast({ title, description });
      }
    }
  };

  return (
    <React.Fragment>
      <PageHeader title="Promotion" description="Manage employee promotions based on experience or education." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Promotion Request</CardTitle>
            <CardDescription>Enter ZanID, select promotion type, then complete the form. All documents must be PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdPromo">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdPromo" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
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
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeDetails.employmentDate ? format(parseISO(employeeDetails.employmentDate.toString()), 'PPP') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeDetails.dateOfBirth ? format(parseISO(employeeDetails.dateOfBirth.toString()), 'PPP') : 'N/A'}</p></div>
                      <div className="lg:col-span-1"><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{typeof employeeDetails.institution === 'object' ? employeeDetails.institution.name : employeeDetails.institution || 'N/A'}</p></div>
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

                <div className="space-y-2">
                    <Label htmlFor="promotionTypeSelect" className="flex items-center"><ListFilter className="mr-2 h-4 w-4 text-primary" />Promotion Type</Label>
                    <Select value={promotionRequestType} onValueChange={(value) => setPromotionRequestType(value as 'experience' | 'education' | '')} disabled={isSubmitting || !!eligibilityError}>
                      <SelectTrigger id="promotionTypeSelect">
                        <SelectValue placeholder="Select promotion type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="experience">Promotion Based on Experience (Performance)</SelectItem>
                        <SelectItem value="education">Promotion Based on Education Advancement</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            
                {promotionRequestType && (
                    <div className={`space-y-4 ${!!eligibilityError ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <h3 className="text-lg font-medium text-foreground">Promotion Details &amp; Documents (PDF Only)</h3>

                        {promotionRequestType === 'experience' && (
                            <>
                                <div>
                                    <Label htmlFor="proposedCadre">Proposed New Grade</Label>
                                    <Input id="proposedCadre" placeholder="e.g., Senior Officer Grade I" value={proposedCadre} onChange={(e) => setProposedCadre(e.target.value)} disabled={isSubmitting || !!eligibilityError} />
                                </div>
                                <div>
                                <Label className="flex items-center mb-2"><Star className="mr-2 h-4 w-4 text-primary" />Upload Performance Appraisal Form (Year 1)</Label>
                                <FileUpload
                                  onChange={handleFileUpload(setPerformanceAppraisalFileY1, 'Performance Appraisal Y1')}
                                  folder="promotion/performance-appraisals"
                                  accept=".pdf"
                                  maxSize={2}
                                  disabled={isSubmitting || !!eligibilityError}
                                />
                                </div>
                                <div>
                                <Label className="flex items-center mb-2"><Star className="mr-2 h-4 w-4 text-primary" />Upload Performance Appraisal Form (Year 2)</Label>
                                <FileUpload
                                  onChange={setPerformanceAppraisalFileY2}
                                  folder="promotion/performance-appraisals"
                                  accept=".pdf"
                                  maxSize={2}
                                  disabled={isSubmitting || !!eligibilityError}
                                />
                                </div>
                                <div>
                                <Label className="flex items-center mb-2"><Star className="mr-2 h-4 w-4 text-primary" />Upload Performance Appraisal Form (Year 3)</Label>
                                <FileUpload
                                  onChange={setPerformanceAppraisalFileY3}
                                  folder="promotion/performance-appraisals"
                                  accept=".pdf"
                                  maxSize={2}
                                  disabled={isSubmitting || !!eligibilityError}
                                />
                                </div>
                                <div>
                                <Label className="flex items-center mb-2"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Civil Service Commission Promotion Form (Tume ya Utumishi)</Label>
                                <FileUpload
                                  onChange={setCscPromotionFormFile}
                                  folder="promotion/csc-forms"
                                  accept=".pdf"
                                  maxSize={2}
                                  disabled={isSubmitting || !!eligibilityError}
                                />
                                </div>
                            </>
                        )}

                        {promotionRequestType === 'education' && (
                            <>
                                <div>
                                <Label className="flex items-center mb-2"><Award className="mr-2 h-4 w-4 text-primary" />Upload Academic Certificate</Label>
                                <FileUpload
                                  onChange={setCertificateFile}
                                  folder="promotion/certificates"
                                  accept=".pdf"
                                  maxSize={2}
                                  disabled={isSubmitting || !!eligibilityError}
                                />
                                </div>
                                <div className="flex items-center space-x-2">
                                <Checkbox id="studiedOutsideCountryPromo" checked={studiedOutsideCountry} onCheckedChange={(checked) => setStudiedOutsideCountry(checked as boolean)} disabled={isSubmitting || !!eligibilityError} />
                                <Label htmlFor="studiedOutsideCountryPromo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Employee studied outside the country? (Requires TCU Form)</Label>
                                </div>
                                {studiedOutsideCountry && (
                                <div>
                                    <Label className="flex items-center mb-2"><ChevronsUpDown className="mr-2 h-4 w-4 text-primary" />Upload TCU Form</Label>
                                    <FileUpload
                                      onChange={setTcuFormFile}
                                      folder="promotion/tcu-forms"
                                      accept=".pdf"
                                      maxSize={2}
                                      disabled={isSubmitting || !!eligibilityError}
                                    />
                                </div>
                                )}
                            </>
                        )}
                        <div>
                            <Label className="flex items-center mb-2"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request</Label>
                            <FileUpload
                              onChange={handleFileUpload(setLetterOfRequestFile, 'Letter of Request')}
                              folder="promotion/letters"
                              accept=".pdf"
                              maxSize={2}
                              disabled={isSubmitting || !!eligibilityError}
                            />
                        </div>
                    </div>
                )}
              </div>
            )}
          </CardContent>
          {employeeDetails && promotionRequestType && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button onClick={handleSubmitPromotionRequest} disabled={isSubmitDisabled()}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Promotion Request
                </Button>
            </CardFooter>
          )}
        </Card>
      )}

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle>Pending Promotion Requests</CardTitle>
          <CardDescription>{pendingRequests.length} request(s) found.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : paginatedRequests.length > 0 ? (
            paginatedRequests.map((request) => (
              <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-base">Promotion Request for: {request.employee.name} (ZanID: {request.employee.zanId})</h3>
                <p className="text-sm text-muted-foreground">Proposed Cadre: {request.proposedCadre}</p>
                <p className="text-sm text-muted-foreground">Type: {request.promotionType}</p>
                <p className="text-sm text-muted-foreground">Submitted: {request.createdAt ? format(parseISO(request.createdAt), 'PPP') : 'N/A'} by {request.submittedBy.name}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
                {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                  {/* HRMO/HHRMD Parallel Review Actions */}
                  {(role === ROLES.HRMO || role === ROLES.HHRMD) && (request.status === 'Pending HRMO/HHRMD Review') && (
                    <>
                      <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify & Forward to Commission</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject & Return to HRO</Button>
                    </>
                  )}
                  
                  {/* Commission Decision Actions */}
                  {(role === ROLES.HRMO || role === ROLES.HHRMD) && request.reviewStage === 'commission_review' && request.status === 'Request Received – Awaiting Commission Decision' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCommissionDecision(request.id, 'approved')}>Approved by Commission</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCommissionDecision(request.id, 'rejected')}>Rejected by Commission</Button>
                    </>
                  )}
                  {(role === ROLES.HRO && 
                    (request.status === 'Rejected by HRMO - Awaiting HRO Correction' || 
                     request.status === 'Rejected by HHRMD - Awaiting HRO Correction')) && (
                    <Button size="sm" onClick={() => handleResubmitClick(request)}>Resubmit</Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No promotion requests found.</p>
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
                Promotion request for <strong>{selectedRequest.employee.name}</strong> (ZanID: {selectedRequest.employee.zanId}).
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
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Promotion Type:</Label>
                        <p className="col-span-2">{selectedRequest.promotionType}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Proposed Grade:</Label>
                        <p className="col-span-2">{selectedRequest.proposedCadre}</p>
                    </div>
                    {selectedRequest.promotionType === 'EducationAdvancement' && (
                        <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold">Studied Outside?:</Label>
                            <p className="col-span-2">{selectedRequest.studiedOutsideCountry ? 'Yes' : 'No'}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Submitted:</Label>
                        <p className="col-span-2">{format(parseISO(selectedRequest.createdAt), 'PPP')} by {selectedRequest.submittedBy.name}</p>
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
                    {selectedRequest.commissionDecisionReason && (
                        <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                            <Label className="text-right font-semibold pt-1">Commission Decision Reason:</Label>
                            <p className="col-span-2">{selectedRequest.commissionDecisionReason}</p>
                        </div>
                    )}
                </div>
                <div className="pt-3 mt-3 border-t">
                    <Label className="font-semibold">Attached Documents</Label>
                    <div className="mt-2 space-y-2">
                    {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                        selectedRequest.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground truncate" title={doc}>{doc}</span>
                                </div>
                                <Button variant="link" size="sm" className="h-auto p-0 flex-shrink-0" onClick={() => handlePreviewFile(doc)}>
                                    Preview
                                </Button>
                            </div>
                        ))
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
        <Dialog open={isRejectionModalOpen} onOpenChange={(open) => {
            setIsRejectionModalOpen(open);
            if (!open) {
              setCurrentRequestToAction(null);
              setIsCommissionRejection(false);
            }
          }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                      {isCommissionRejection ? 'Commission Decision: Rejection' : `Reject Promotion Request: ${currentRequestToAction.id}`}
                    </DialogTitle>
                    <DialogDescription>
                        Please provide the reason for {isCommissionRejection ? 'the Commission\'s rejection of' : 'rejecting'} the promotion request for <strong>{currentRequestToAction.employee.name}</strong> ({currentRequestToAction.promotionType}). 
                        {isCommissionRejection ? ' This decision is final and no corrections will be allowed.' : ' This reason will be visible to the HRO for correction.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder={isCommissionRejection ? "Enter Commission's rejection reason..." : "Enter rejection reason here..."}
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { 
                      setIsRejectionModalOpen(false); 
                      setCurrentRequestToAction(null); 
                      setIsCommissionRejection(false);
                    }}>Cancel</Button>
                    <Button variant="destructive" onClick={handleRejectionSubmit} disabled={!rejectionReasonInput.trim()}>
                      {isCommissionRejection ? 'Submit Final Decision' : 'Submit Rejection'}
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
    </React.Fragment>
  );
}


'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import type { Employee } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, CalendarDays, Paperclip, ClipboardCheck, AlertTriangle, FileWarning, PauseOctagon, Files } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface MockPendingDismissalRequest {
  id: string;
  employeeName: string;
  zanId: string;
  department: string;
  cadre: string;
  employmentDate: string;
  dateOfBirth: string;
  institution: string;
  reasonSummary: string;
  proposedDate: string;
  submissionDate: string;
  submittedBy: string;
  status: string;
  documents?: string[];
  reviewStage: 'initial' | 'commission_review' | 'completed';
  rejectionReason?: string;
  reviewedBy?: string;
}

const initialMockPendingDismissalRequests: MockPendingDismissalRequest[] = [
  {
    id: 'DISMISS001',
    employeeName: 'Ali Juma Ali', 
    zanId: '221458232', 
    department: 'Administration',
    cadre: 'Administrative Officer',
    employmentDate: '2023-01-10',
    dateOfBirth: '1980-05-15',
    institution: 'Central Government Office',
    reasonSummary: 'Failure to meet performance standards during probation period.',
    proposedDate: '2024-08-15',
    submissionDate: '2024-07-29',
    submittedBy: 'K. Mnyonge (HRO)',
    status: 'Pending DO Review',
    documents: ['Letter of Request', 'Form for Appraisal (Optional)', 'Warning Letter(s)'],
    reviewStage: 'initial',
  },
];

export default function DismissalPage() {
  const { role, user } = useAuth();
  const [zanId, setZanId] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isFetchingEmployee, setIsFetchingEmployee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reasonDismissal, setReasonDismissal] = useState('');
  const [proposedDateDismissal, setProposedDateDismissal] = useState('');
  
  const [appraisalFormFile, setAppraisalFormFile] = useState<FileList | null>(null);
  const [supportingDocumentsFile, setSupportingDocumentsFile] = useState<FileList | null>(null); 
  
  const [warningLettersFile, setWarningLettersFile] = useState<FileList | null>(null);
  const [employeeExplanationLetterFile, setEmployeeExplanationLetterFile] = useState<FileList | null>(null);
  const [suspensionLetterFile, setSuspensionLetterFile] = useState<FileList | null>(null);
  const [summonNoticeFile, setSummonNoticeFile] = useState<FileList | null>(null);
  const [investigationCommitteeReportFile, setInvestigationCommitteeReportFile] = useState<FileList | null>(null);
  const [otherAdditionalDocumentsFile, setOtherAdditionalDocumentsFile] = useState<FileList | null>(null);

  const [letterOfRequestFile, setLetterOfRequestFile] = useState<FileList | null>(null);
  const [minProposedDate, setMinProposedDate] = useState('');

  const [pendingRequests, setPendingRequests] = useState<MockPendingDismissalRequest[]>(initialMockPendingDismissalRequests);
  const [selectedRequest, setSelectedRequest] = useState<MockPendingDismissalRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<MockPendingDismissalRequest | null>(null);

  useEffect(() => {
    setMinProposedDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const isDismissalAllowed = employeeDetails && employeeDetails.status === 'On Probation';

  const resetFormFields = () => {
    setReasonDismissal('');
    setProposedDateDismissal('');
    setAppraisalFormFile(null);
    setSupportingDocumentsFile(null);
    setLetterOfRequestFile(null);
    setWarningLettersFile(null);
    setEmployeeExplanationLetterFile(null);
    setSuspensionLetterFile(null);
    setSummonNoticeFile(null);
    setInvestigationCommitteeReportFile(null);
    setOtherAdditionalDocumentsFile(null);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => (input as HTMLInputElement).value = '');
  };

  const handleFetchEmployeeDetails = async () => {
    if (!zanId) {
      toast({ title: "ZanID Required", description: "Please enter an employee's ZanID.", variant: "destructive" });
      return;
    }
    setIsFetchingEmployee(true);
    setEmployeeDetails(null);
    resetFormFields();

    try {
        const response = await fetch(`/api/employees/search?zanId=${zanId}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Employee not found");
        }
        const result = await response.json();
        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error("Employee not found");
        }
        const foundEmployee: Employee = result.data[0];
        setEmployeeDetails(foundEmployee);
        if (foundEmployee.status !== 'On Probation') {
          toast({
            title: "Dismissal Not Applicable",
            description: `Dismissal is only for 'On Probation' employees. This employee is '${foundEmployee.status}'.`,
            variant: "destructive",
            duration: 7000,
          });
        } else {
           toast({ title: "Employee Found", description: `Details for ${foundEmployee.name} loaded.` });
        }
    } catch(error: any) {
        toast({ title: "Employee Not Found", description: error.message || `No employee found with ZanID: ${zanId}.`, variant: "destructive" });
    } finally {
        setIsFetchingEmployee(false);
    }
  };

  const handleSubmitDismissalRequest = () => {
    if (!employeeDetails) {
      toast({ title: "Submission Error", description: "Employee details are missing.", variant: "destructive" });
      return;
    }
    if (!isDismissalAllowed) {
      toast({ title: "Submission Error", description: `Dismissal is only applicable to employees 'On Probation'. This employee is '${employeeDetails.status}'.`, variant: "destructive", duration: 7000 });
      return;
    }
    if (!reasonDismissal || !proposedDateDismissal) {
      toast({ title: "Submission Error", description: "Reason for Dismissal and Proposed Date are required.", variant: "destructive" });
      return;
    }
    if (!letterOfRequestFile) {
      toast({ title: "Submission Error", description: "Letter of Request is missing. Please upload the PDF document.", variant: "destructive" });
      return;
    }

    const checkPdf = (fileList: FileList | null) => !fileList || (fileList[0] && fileList[0].type === "application/pdf");

    if (!checkPdf(appraisalFormFile)) {
      toast({ title: "Submission Error", description: "Appraisal Form must be a PDF file.", variant: "destructive" }); return;
    }
    if (supportingDocumentsFile && !checkPdf(supportingDocumentsFile)) { 
      toast({ title: "Submission Error", description: "Supporting Documents (general) must be a PDF file.", variant: "destructive" }); return;
    }
    if (letterOfRequestFile && letterOfRequestFile[0].type !== "application/pdf") {
      toast({ title: "Submission Error", description: "Letter of Request must be a PDF file.", variant: "destructive" }); return;
    }
    if (warningLettersFile && !checkPdf(warningLettersFile)) {
      toast({ title: "Submission Error", description: "Warning Letter(s) must be a PDF file.", variant: "destructive" }); return;
    }
    if (employeeExplanationLetterFile && !checkPdf(employeeExplanationLetterFile)) {
      toast({ title: "Submission Error", description: "Employee Explanation Letter must be a PDF file.", variant: "destructive" }); return;
    }
    if (suspensionLetterFile && !checkPdf(suspensionLetterFile)) {
      toast({ title: "Submission Error", description: "Suspension Letter must be a PDF file.", variant: "destructive" }); return;
    }
    if (summonNoticeFile && !checkPdf(summonNoticeFile)) {
      toast({ title: "Submission Error", description: "Summon Notice must be a PDF file.", variant: "destructive" }); return;
    }
    if (investigationCommitteeReportFile && !checkPdf(investigationCommitteeReportFile)) {
      toast({ title: "Submission Error", description: "Investigation Committee Report must be a PDF file.", variant: "destructive" }); return;
    }
    if (otherAdditionalDocumentsFile && !checkPdf(otherAdditionalDocumentsFile)) {
      toast({ title: "Submission Error", description: "Other Additional Documents must be a PDF file.", variant: "destructive" }); return;
    }

    setIsSubmitting(true);
    const newRequestId = `DISMISS${Date.now().toString().slice(-3)}`;
    let documentsList = ['Letter of Request'];
    if (appraisalFormFile) documentsList.push('Form for Appraisal');
    if (supportingDocumentsFile) documentsList.push('Supporting Documents (General)');
    if (warningLettersFile) documentsList.push('Warning Letter(s)');
    if (employeeExplanationLetterFile) documentsList.push('Employee Explanation Letter');
    if (suspensionLetterFile) documentsList.push('Suspension Letter');
    if (summonNoticeFile) documentsList.push('Summon Notice/Invitation Letter');
    if (investigationCommitteeReportFile) documentsList.push('Investigation Committee Report');
    if (otherAdditionalDocumentsFile) documentsList.push('Other Additional Document(s)');

    const newRequest: MockPendingDismissalRequest = {
        id: newRequestId,
        employeeName: employeeDetails.name,
        zanId: employeeDetails.zanId,
        department: employeeDetails.department || 'N/A',
        cadre: employeeDetails.cadre || 'N/A',
        employmentDate: employeeDetails.employmentDate?.toString() || 'N/A',
        dateOfBirth: employeeDetails.dateOfBirth?.toString() || 'N/A',
        institution: typeof employeeDetails.institution === 'object' ? employeeDetails.institution.name : employeeDetails.institution || 'N/A',
        reasonSummary: reasonDismissal,
        proposedDate: proposedDateDismissal,
        submissionDate: format(new Date(), 'yyyy-MM-dd'),
        submittedBy: `${user?.name} (${user?.role})`,
        status: role === ROLES.DO ? 'Pending DO Review' : (role === ROLES.HHRMD ? 'Pending HHRMD Review' : 'Pending Review'),
        documents: documentsList,
        reviewStage: 'initial',
    };

    console.log("Submitting Dismissal Request:", newRequest);

    setTimeout(() => {
      setPendingRequests(prev => [newRequest, ...prev]);
      toast({ title: "Dismissal Request Submitted", description: `Request for ${employeeDetails.name} submitted successfully.` });
      setZanId('');
      setEmployeeDetails(null);
      resetFormFields();
      setIsSubmitting(false);
    }, 1500);
  };

  const handleInitialAction = (requestId: string, action: 'forward' | 'reject') => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;

    if (action === 'reject') {
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    } else if (action === 'forward') {
      let toastMessage = "";
      setPendingRequests(prevRequests =>
        prevRequests.map(req => {
          if (req.id === requestId) {
            toastMessage = `Request ${requestId} for ${req.employeeName} forwarded to Commission.`;
            return { ...req, status: "Request Received – Awaiting Commission Decision", reviewStage: 'commission_review', reviewedBy: role || undefined };
          }
          return req;
        })
      );
      if(toastMessage) {
        toast({ title: "Request Forwarded", description: toastMessage });
      }
    }
  };

  const handleRejectionSubmit = () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim()) {
      toast({ title: "Rejection Error", description: "Reason for rejection is required.", variant: "destructive" });
      return;
    }
    const requestId = currentRequestToAction.id;
    const employeeName = currentRequestToAction.employeeName;
    let toastMessage = "";

    setPendingRequests(prevRequests =>
      prevRequests.map(req => {
        if (req.id === requestId) {
          toastMessage = `Request ${requestId} for ${employeeName} rejected and returned to HRO.`;
          return { ...req, status: `Rejected by ${role} - Awaiting HRO Correction`, rejectionReason: rejectionReasonInput, reviewStage: 'initial' };
        }
        return req;
      })
    );
    if (toastMessage) {
      toast({ title: "Request Rejected", description: toastMessage, variant: 'destructive' });
    }
    setIsRejectionModalOpen(false);
    setCurrentRequestToAction(null);
    setRejectionReasonInput('');
  };

  const handleCommissionDecision = (requestId: string, decision: 'approved' | 'rejected') => {
    const request = pendingRequests.find(req => req.id === requestId);
    if (!request) return;

    const finalStatus = decision === 'approved' ? "Approved by Commission" : "Rejected by Commission - Request Concluded";
    let toastMessage = "";
    setPendingRequests(prevRequests =>
      prevRequests.map(req => {
        if (req.id === requestId) {
          toastMessage = `Request ${requestId} for ${req.employeeName} has been ${finalStatus.toLowerCase()}.`;
          return { ...req, status: finalStatus, reviewStage: 'completed' };
        }
        return req;
      })
    );
    if (toastMessage) {
      toast({ title: `Commission Decision: ${decision === 'approved' ? 'Approved' : 'Rejected'}`, description: toastMessage });
    }
  };

  const isSubmitButtonDisabled = !employeeDetails ||
    !isDismissalAllowed ||
    !reasonDismissal ||
    !proposedDateDismissal ||
    !letterOfRequestFile ||
    isSubmitting;

  return (
    <div>
      <PageHeader title="Dismissal" description="Process employee dismissals for unconfirmed employees." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Dismissal Request</CardTitle>
            <CardDescription>Enter ZanID to fetch employee details, then complete the dismissal form. All documents must be PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zanIdDismissal">Employee ZanID</Label>
              <div className="flex space-x-2">
                <Input id="zanIdDismissal" placeholder="Enter ZanID" value={zanId} onChange={(e) => setZanId(e.target.value)} disabled={isFetchingEmployee || isSubmitting} />
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
                      <div><Label className="text-muted-foreground">Employment Date:</Label> <p className="font-semibold text-foreground">{employeeDetails.employmentDate ? format(parseISO(employeeDetails.employmentDate.toString()), 'PPP') : 'N/A'}</p></div>
                      <div><Label className="text-muted-foreground">Date of Birth:</Label> <p className="font-semibold text-foreground">{employeeDetails.dateOfBirth ? format(parseISO(employeeDetails.dateOfBirth.toString()), 'PPP') : 'N/A'}</p></div>
                      <div className="lg:col-span-1"><Label className="text-muted-foreground">Institution:</Label> <p className="font-semibold text-foreground">{typeof employeeDetails.institution === 'object' ? employeeDetails.institution.name : employeeDetails.institution || 'N/A'}</p></div>
                      <div className="md:col-span-2 lg:col-span-3"><Label className="text-muted-foreground">Current Status:</Label> <p className={`font-semibold ${isDismissalAllowed ? 'text-green-600' : 'text-red-600'}`}>{employeeDetails.status || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                {!isDismissalAllowed && (
                  <div className="flex items-center p-4 mt-4 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3" />
                    <span>Dismissal is only applicable to employees 'On Probation'. This employee is '{employeeDetails.status}'. Form submission is disabled.</span>
                  </div>
                )}

                <div className={`space-y-4 ${!isDismissalAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-foreground">Dismissal Details &amp; Documents</h3>
                  <div>
                    <Label htmlFor="reasonDismissal">Reason for Dismissal</Label>
                    <Textarea id="reasonDismissal" placeholder="Clearly state the grounds for dismissal" value={reasonDismissal} onChange={(e) => setReasonDismissal(e.target.value)} disabled={!isDismissalAllowed || isSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="proposedDateDismissal" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" />Proposed Date of Dismissal</Label>
                    <Input id="proposedDateDismissal" type="date" value={proposedDateDismissal} onChange={(e) => setProposedDateDismissal(e.target.value)} disabled={!isDismissalAllowed || isSubmitting} min={minProposedDate} />
                  </div>
                  
                  <h4 className="text-md font-medium text-foreground pt-2">Upload Required Documents (PDF Only)</h4>
                   <div>
                    <Label htmlFor="letterOfRequestFileDismissal" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request (Required)</Label>
                    <Input id="letterOfRequestFileDismissal" type="file" onChange={(e) => setLetterOfRequestFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                  
                  <h4 className="text-md font-medium text-foreground pt-2">Upload Optional Supporting Documents (PDF Only)</h4>
                  <div>
                    <Label htmlFor="appraisalFormFile" className="flex items-center"><ClipboardCheck className="mr-2 h-4 w-4 text-primary" />Upload Form for Appraisal</Label>
                    <Input id="appraisalFormFile" type="file" onChange={(e) => setAppraisalFormFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                   <div>
                    <Label htmlFor="warningLettersFile" className="flex items-center"><FileWarning className="mr-2 h-4 w-4 text-orange-500" />Upload Warning Letter(s)</Label>
                    <Input id="warningLettersFile" type="file" onChange={(e) => setWarningLettersFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="employeeExplanationLetterFile" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Employee Explanation Letter</Label>
                    <Input id="employeeExplanationLetterFile" type="file" onChange={(e) => setEmployeeExplanationLetterFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                   <div>
                    <Label htmlFor="suspensionLetterFile" className="flex items-center"><PauseOctagon className="mr-2 h-4 w-4 text-red-500" />Upload Suspension Letter</Label>
                    <Input id="suspensionLetterFile" type="file" onChange={(e) => setSuspensionLetterFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="summonNoticeFile" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Summon Notice / Invitation Letter</Label>
                    <Input id="summonNoticeFile" type="file" onChange={(e) => setSummonNoticeFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="investigationCommitteeReportFile" className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" />Upload Investigation Committee Report</Label>
                    <Input id="investigationCommitteeReportFile" type="file" onChange={(e) => setInvestigationCommitteeReportFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="supportingDocumentsFile" className="flex items-center"><Paperclip className="mr-2 h-4 w-4 text-primary" />Upload General Supporting Documents</Label>
                    <Input id="supportingDocumentsFile" type="file" onChange={(e) => setSupportingDocumentsFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                   <div>
                    <Label htmlFor="otherAdditionalDocumentsFile" className="flex items-center"><Files className="mr-2 h-4 w-4 text-primary" />Upload Other Additional Documents</Label>
                    <Input id="otherAdditionalDocumentsFile" type="file" onChange={(e) => setOtherAdditionalDocumentsFile(e.target.files)} accept=".pdf" disabled={!isDismissalAllowed || isSubmitting}/>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button
                onClick={handleSubmitDismissalRequest}
                disabled={isSubmitButtonDisabled}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Dismissal Request
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
      {(role === ROLES.DO || role === ROLES.HHRMD ) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Review Dismissal Requests</CardTitle>
            <CardDescription>Review, approve, or reject pending dismissal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.filter(req => 
                (role === ROLES.DO && req.status === 'Pending DO Review') ||
                (role === ROLES.HHRMD && req.status === 'Pending HHRMD Review') ||
                req.status === 'Request Received – Awaiting Commission Decision' ||
                req.status.startsWith('Rejected by') || req.status.startsWith('Approved by Commission') || req.status.startsWith('Rejected by Commission')
            ).length > 0 ? (
              pendingRequests.filter(req => 
                (role === ROLES.DO && req.status === 'Pending DO Review') ||
                (role === ROLES.HHRMD && req.status === 'Pending HHRMD Review') ||
                req.status === 'Request Received – Awaiting Commission Decision' ||
                req.status.startsWith('Rejected by') || req.status.startsWith('Approved by Commission') || req.status.startsWith('Rejected by Commission')
              ).map((request) => (
                <div key={request.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-base">Dismissal for: {request.employeeName} (ZanID: {request.zanId})</h3>
                  <p className="text-sm text-muted-foreground">Reason: {request.reasonSummary}</p>
                  <p className="text-sm text-muted-foreground">Proposed Date: {request.proposedDate ? format(parseISO(request.proposedDate), 'PPP') : 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Submitted: {request.submissionDate ? format(parseISO(request.submissionDate), 'PPP') : 'N/A'} by {typeof request.submittedBy === 'object' ? request.submittedBy?.name : request.submittedBy || 'N/A'}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> <span className="text-primary">{request.status}</span></p>
                  {request.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {request.rejectionReason}</p>}
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRequest(request); setIsDetailsModalOpen(true); }}>View Details</Button>
                    {request.reviewStage === 'initial' && (request.status.startsWith(`Pending ${role} Review`)) && (
                      <>
                        <Button size="sm" onClick={() => handleInitialAction(request.id, 'forward')}>Verify &amp; Forward to Commission</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleInitialAction(request.id, 'reject')}>Reject &amp; Return to HRO</Button>
                      </>
                    )}
                    {request.reviewStage === 'commission_review' && request.status === 'Request Received – Awaiting Commission Decision' && request.reviewedBy === role && (
                        <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCommissionDecision(request.id, 'approved')}>Approved by Commission</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleCommissionDecision(request.id, 'rejected')}>Rejected by Commission</Button>
                        </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No dismissal requests pending your review.</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedRequest && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                Dismissal request for <strong>{selectedRequest.employeeName}</strong> (ZanID: {selectedRequest.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
                <div className="space-y-1 border-b pb-3 mb-3">
                    <h4 className="font-semibold text-base text-foreground mb-2">Employee Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Full Name:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employeeName}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">ZanID:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.zanId}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Department:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.department}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Cadre/Position:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.cadre}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Employment Date:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.employmentDate ? format(parseISO(selectedRequest.employmentDate), 'PPP') : 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Date of Birth:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.dateOfBirth ? format(parseISO(selectedRequest.dateOfBirth), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Institution:</Label>
                        <p className="col-span-2 font-medium text-foreground">{typeof selectedRequest.institution === 'object' ? selectedRequest.institution?.name : selectedRequest.institution || 'N/A'}</p>
                    </div>
                </div>
                 <div className="space-y-1">
                     <h4 className="font-semibold text-base text-foreground mb-2">Request Information</h4>
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold pt-1">Reason Summary:</Label>
                        <p className="col-span-2">{selectedRequest.reasonSummary}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Proposed Date:</Label>
                        <p className="col-span-2">{selectedRequest.proposedDate ? format(parseISO(selectedRequest.proposedDate), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">Submitted:</Label>
                        <p className="col-span-2">{selectedRequest.submissionDate ? format(parseISO(selectedRequest.submissionDate), 'PPP') : 'N/A'} by {typeof selectedRequest.submittedBy === 'object' ? selectedRequest.submittedBy?.name : selectedRequest.submittedBy || 'N/A'}</p>
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
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold pt-1">Documents:</Label>
                        <div className="col-span-2">
                        {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                            <ul className="list-disc pl-5 text-muted-foreground">
                            {selectedRequest.documents.map((doc, index) => <li key={index}>{doc}</li>)}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground">No documents listed.</p>
                        )}
                        </div>
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
                    <DialogTitle>Reject Dismissal Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the dismissal request for <strong>{currentRequestToAction.employeeName}</strong>. This reason will be visible to the HRO.
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
    </div>
  );
}


'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import React, { useState, useEffect, useCallback } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, FileText, CalendarDays, ListFilter, Stethoscope, ClipboardCheck, AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { addMonths, addYears, format, isBefore, differenceInYears, parseISO, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from '@/components/ui/textarea';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { useAuthStore } from '@/store/auth-store';
import { EmployeeSearch } from '@/components/shared/employee-search';

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
  proposedDate: string | null;
  delayReason?: string | null;
  documents: string[];
}

const COMPULSORY_RETIREMENT_AGE = 60;
const VOLUNTARY_RETIREMENT_AGE = 55;

export default function RetirementPage() {
  const { role, user } = useAuth();
  const { accessToken } = useAuthStore();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPendingRetirement, setHasPendingRetirement] = useState(false);

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
  const itemsPerPage = 50;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  // Employee status validation
  const isEmployeeRetired = employeeDetails?.status === 'Retired';
  const cannotSubmitRetirement = isEmployeeRetired;

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

  useEffect(() => {
    const sixMonthsFromNow = addMonths(new Date(), 6);
    setMinRetirementDate(format(sixMonthsFromNow, 'yyyy-MM-dd'));
  }, []);

  const fetchRequests = useCallback(async (isRefresh = false, page = currentPage) => {
    if (!user || !role) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      // Build query parameters using URLSearchParams
      const params = new URLSearchParams({
        userId: user.id,
        userRole: role,
        userInstitutionId: user.institutionId || '',
        page: page.toString(),
        size: itemsPerPage.toString()
      });

      // Add cache-busting parameter for refresh
      if (isRefresh) {
        params.append('_t', Date.now().toString());
      }

      const response = await fetch(`/api/retirement?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': isRefresh ? 'no-cache, no-store, must-revalidate' : 'default',
          'Pragma': isRefresh ? 'no-cache' : 'default',
          'Expires': isRefresh ? '0' : 'default'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch retirement requests');
      const data = await response.json();

      // Handle both array and paginated object responses
      let requests = [];
      if (Array.isArray(data)) {
        requests = data;
        setTotalItems(data.length);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      } else if (data.data && Array.isArray(data.data)) {
        requests = data.data;
        setTotalItems(data.pagination?.total || data.data.length);
        setTotalPages(data.pagination?.totalPages || Math.ceil((data.pagination?.total || data.data.length) / itemsPerPage));
      }

      setPendingRequests(requests);
      if (isRefresh) {
        toast({ title: "Refreshed", description: "Retirement requests have been updated.", duration: 2000 });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not load retirement requests.", variant: "destructive" });
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [user, role, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchRequests(false, currentPage);
    }
  }, [currentPage]);

  // Auto-fill retirement date for compulsory retirement
  useEffect(() => {
    if (retirementType === 'compulsory' && employeeDetails && employeeDetails.dateOfBirth) {
      // Parse date manually to avoid timezone issues
      const birthDateStr = employeeDetails.dateOfBirth.split('T')[0]; // Get only YYYY-MM-DD part
      const [year, month, day] = birthDateStr.split('-').map(Number);

      // Calculate retirement date: add 60 years to birth year, keep same month and day
      // Then add 1 day to ensure they've completed their 60th year
      const retirementYear = year + COMPULSORY_RETIREMENT_AGE;

      // Create a date object and add 1 day
      const retirementDate = new Date(retirementYear, month - 1, day); // month is 0-indexed in Date
      retirementDate.setDate(retirementDate.getDate() + 1); // Add 1 day

      // Format back to YYYY-MM-DD
      const formattedYear = retirementDate.getFullYear();
      const formattedMonth = String(retirementDate.getMonth() + 1).padStart(2, '0');
      const formattedDay = String(retirementDate.getDate()).padStart(2, '0');
      const formattedDate = `${formattedYear}-${formattedMonth}-${formattedDay}`;

      setRetirementDate(formattedDate);
    }
  }, [retirementType, employeeDetails]);

  useEffect(() => {
    setAgeEligibilityError(null);
    setShowDelayFields(false);

    if (employeeDetails && employeeDetails.dateOfBirth && retirementType && retirementDate) {
      // Parse date strings manually to avoid timezone issues
      const birthDateStr = employeeDetails.dateOfBirth.split('T')[0]; // Get only YYYY-MM-DD part
      const retirementDateStr = retirementDate;

      const [birthYear, birthMonth, birthDay] = birthDateStr.split('-').map(Number);
      const [retireYear, retireMonth, retireDay] = retirementDateStr.split('-').map(Number);

      // Calculate age at retirement more accurately
      let ageAtRetirement = retireYear - birthYear;

      // Check if birthday has occurred in the retirement year
      if (retireMonth < birthMonth || (retireMonth === birthMonth && retireDay < birthDay)) {
        ageAtRetirement--; // Birthday hasn't occurred yet in retirement year
      }

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

  // Auto-fill corrected retirement date for compulsory retirement in correction modal
  useEffect(() => {
    if (correctedRetirementType === 'compulsory' && requestToCorrect && requestToCorrect.Employee.dateOfBirth) {
      // Parse date manually to avoid timezone issues
      const birthDateStr = requestToCorrect.Employee.dateOfBirth.split('T')[0]; // Get only YYYY-MM-DD part
      const [year, month, day] = birthDateStr.split('-').map(Number);

      // Calculate retirement date: add 60 years to birth year, keep same month and day
      // Then add 1 day to ensure they've completed their 60th year
      const retirementYear = year + COMPULSORY_RETIREMENT_AGE;

      // Create a date object and add 1 day
      const retirementDate = new Date(retirementYear, month - 1, day); // month is 0-indexed in Date
      retirementDate.setDate(retirementDate.getDate() + 1); // Add 1 day

      // Format back to YYYY-MM-DD
      const formattedYear = retirementDate.getFullYear();
      const formattedMonth = String(retirementDate.getMonth() + 1).padStart(2, '0');
      const formattedDay = String(retirementDate.getDate()).padStart(2, '0');
      const formattedDate = `${formattedYear}-${formattedMonth}-${formattedDay}`;

      setCorrectedRetirementDate(formattedDate);
    }
  }, [correctedRetirementType, requestToCorrect]);

  // Validation for corrected retirement date in correction modal
  useEffect(() => {
    setCorrectedAgeEligibilityError(null);
    setShowCorrectedDelayFields(false);

    if (requestToCorrect && requestToCorrect.Employee.dateOfBirth && correctedRetirementType && correctedRetirementDate) {
      // Parse date strings manually to avoid timezone issues
      const birthDateStr = requestToCorrect.Employee.dateOfBirth.split('T')[0]; // Get only YYYY-MM-DD part
      const retirementDateStr = correctedRetirementDate;

      const [birthYear, birthMonth, birthDay] = birthDateStr.split('-').map(Number);
      const [retireYear, retireMonth, retireDay] = retirementDateStr.split('-').map(Number);

      // Calculate age at retirement more accurately
      let ageAtRetirement = retireYear - birthYear;

      // Check if birthday has occurred in the retirement year
      if (retireMonth < birthMonth || (retireMonth === birthMonth && retireDay < birthDay)) {
        ageAtRetirement--; // Birthday hasn't occurred yet in retirement year
      }

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
    setHasPendingRetirement(false);
  };

  const handleEmployeeFound = (employee: Employee) => {
    resetFormFields();

    // Check for pending retirement request
    const pendingStatuses = [
      'Pending HRMO/HHRMD Review',
      'Pending DO/HHRMD Review',
      'Request Received – Awaiting Commission Decision'
    ];

    const hasPending = pendingRequests.some(
      req => req.Employee.id === employee.id && pendingStatuses.includes(req.status)
    );

    if (hasPending) {
      setHasPendingRetirement(true);
      toast({
        title: "Request Already Submitted",
        description: "A retirement request for this employee is already being reviewed. You cannot submit another request until the current one is completed.",
        variant: "destructive",
        duration: 6000
      });
    }

    setEmployeeDetails(employee);

    if (!employee.dateOfBirth) {
      toast({ title: "Missing Information", description: "Employee date of birth is missing. Age validation cannot be performed.", variant: "warning", duration: 5000 });
    }
  };

  const handleEmployeeClear = () => {
    setEmployeeDetails(null);
    resetFormFields();
  };

  const handleSubmitRetirementRequest = async () => {
    if (!employeeDetails || !user) {
      toast({ title: "Submission Error", description: "Employee or user details are missing.", variant: "destructive" });
      return;
    }
    
    if (cannotSubmitRetirement) {
      toast({ 
        title: "Retirement Not Applicable", 
        description: "Cannot request retirement for employees who are already retired.", 
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Validation checks
    if (!retirementType) {
      toast({ title: "Submission Error", description: "Please select a retirement type.", variant: "destructive" });
      return;
    }
    
    if (!retirementDate && retirementType !== 'illness') {
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
      proposedDate: retirementDate ? new Date(retirementDate).toISOString() : null,
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

        const result = await response.json();

        // Check if the API request was successful
        if (!response.ok || !result.success) {
          const errorMessage = result.message || 'Failed to submit request';
          throw new Error(errorMessage);
        }

        await fetchRequests(); // Refresh list
        toast({
          title: "Retirement Request Submitted",
          description: `Request for ${employeeDetails.name} submitted successfully.`
        });
        setEmployeeDetails(null);
        resetFormFields();
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Could not submit the retirement request.";
        toast({
          title: "Submission Failed",
          description: errorMessage,
          variant: "destructive"
        });
        console.error('Retirement submission error:', error);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isSubmitDisabled =
    !employeeDetails ||
    !retirementType ||
    (retirementType !== 'illness' && !retirementDate) ||
    letterOfRequestFile === '' ||
    (retirementType === 'illness' && (medicalFormFile === '' || illnessLeaveLetterFile === '' || !illnessDescription)) ||
    (showDelayFields && (!delayReason.trim() || delayDocumentFile === '')) ||
    (ageEligibilityError && !showDelayFields) ||
    cannotSubmitRetirement ||
    hasPendingRetirement ||
    isSubmitting;
  
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
        description: `${actionDescription} for ${request.Employee.name}. Status: ${payload.status}`,
        duration: 3000 
      });
    }

    try {
        const response = await fetch(`/api/retirement`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({id: requestId, ...payload, reviewedById: user?.id })
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
    const request = pendingRequests.find(req => req.id === requestId);
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
    
    const success = await handleUpdateRequest(currentRequestToAction.id, payload, "Request rejected and returned to HRO");
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
      ? `Retirement request approved by Commission for ${request.Employee.name}`
      : `Retirement request rejected by Commission for ${request.Employee.name}`;
    
    await handleUpdateRequest(requestId, payload, actionDescription);
  };

  const handleResubmit = (request: RetirementRequest) => {
    setRequestToCorrect(request);
    setCorrectedRetirementType(request.retirementType);
    setCorrectedRetirementDate(request.proposedDate || '');
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
    if (!correctedRetirementType || (correctedRetirementType !== 'illness' && !correctedRetirementDate) || !correctedLetterOfRequestFile) {
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

      // Convert date string to ISO-8601 DateTime format (null for illness retirement)
      const proposedDateTime = correctedRetirementDate ? new Date(correctedRetirementDate).toISOString() : null;
      
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

      // Use the optimistic update pattern for consistency
      const success = await handleUpdateRequest(request.id, payload, `Retirement request resubmitted for review`);
      
      if (success) {
        setIsCorrectionModalOpen(false);
        setRequestToCorrect(null);
      }
    } catch (error) {
      console.error("[RESUBMIT_RETIREMENT]", error);
      toast({ title: "Error", description: "Failed to resubmit retirement request.", variant: "destructive" });
    }
  };

  const paginatedRequests = pendingRequests || [];

  return (
    <div>
      <PageHeader title="Retirement" description="Manage employee retirement processes." />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Retirement Request</CardTitle>
            <CardDescription>Search for an employee by ZANID or Payroll Number, then fill retirement details and upload required PDF documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EmployeeSearch 
              onEmployeeFound={handleEmployeeFound}
              onClear={handleEmployeeClear}
              disabled={isSubmitting}
            />

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
                      <div className="md:col-span-2 lg:col-span-3"><Label className="text-muted-foreground">Current Status:</Label> <p className={`font-semibold ${cannotSubmitRetirement ? 'text-destructive' : 'text-green-600'}`}>{employeeDetails.status || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                {cannotSubmitRetirement && (
                  <div className="flex items-center p-4 mt-2 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>Cannot request retirement for employees who are already retired.</span>
                  </div>
                )}

                 {ageEligibilityError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Eligibility Error</AlertTitle>
                    <AlertDescription>{ageEligibilityError}</AlertDescription>
                  </Alert>
                )}

                {hasPendingRetirement && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request Already Submitted</AlertTitle>
                    <AlertDescription>A retirement request for this employee is already being reviewed. You cannot submit another request until the current one is completed.</AlertDescription>
                  </Alert>
                )}

                <div className={`space-y-4 ${(ageEligibilityError && !showDelayFields) || cannotSubmitRetirement || hasPendingRetirement ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <h3 className="text-lg font-medium text-foreground">Retirement Details &amp; Documents (PDF Only)</h3>
                  <div>
                    <Label htmlFor="retirementType" className="flex items-center"><ListFilter className="mr-2 h-4 w-4 text-primary" />Retirement Type</Label>
                    <Select value={retirementType} onValueChange={setRetirementType} disabled={isSubmitting || (ageEligibilityError && !showDelayFields) || cannotSubmitRetirement || hasPendingRetirement}>
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
                  {retirementType !== 'illness' && (
                    <div>
                      <Label htmlFor="retirementDate" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" />Proposed Retirement Date</Label>
                      <Input id="retirementDate" type="date" value={retirementDate} onChange={(e) => setRetirementDate(e.target.value)} disabled={isSubmitting || (ageEligibilityError && !showDelayFields) || cannotSubmitRetirement} min={minRetirementDate} />
                    </div>
                  )}
                  
                  {retirementType === 'illness' && (
                    <>
                      <div>
                        <Label htmlFor="illnessDescription">Type of Illness</Label>
                        <Textarea 
                          id="illnessDescription" 
                          placeholder="Describe the illness as per the medical report" 
                          value={illnessDescription} 
                          onChange={(e) => setIllnessDescription(e.target.value)} 
                          disabled={isSubmitting || (ageEligibilityError && !showDelayFields) || cannotSubmitRetirement}
                        />
                      </div>
                      <div>
                        <Label htmlFor="medicalFormFile" className="flex items-center"><Stethoscope className="mr-2 h-4 w-4 text-primary" />Upload Medical Form (Required, PDF Only)</Label>
                        <FileUpload
                          folder="retirement"
                          value={medicalFormFile}
                          onChange={setMedicalFormFile}
                          onPreview={handlePreviewFile}
                          disabled={isSubmitting || (ageEligibilityError && !showDelayFields) || cannotSubmitRetirement}
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
                          disabled={isSubmitting || (ageEligibilityError && !showDelayFields) || cannotSubmitRetirement}
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
                      disabled={isSubmitting || (ageEligibilityError && !showDelayFields) || cannotSubmitRetirement}
                      required
                    />
                  </div>
                   {retirementType !== 'illness' && (
                    <p className="text-xs text-muted-foreground">
                      Note: Proposed retirement date must be at least 6 months from today. Age validation is based on the proposed retirement date.
                    </p>
                   )}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Submitted Retirement Requests</CardTitle>
                <CardDescription>Track the status of retirement requests you have submitted.</CardDescription>
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    Retirement Request for: {request.Employee.name} (ZanID: {request.Employee.zanId})
                    {(request.status.includes('Approved by Commission') || request.status.includes('Rejected by Commission')) && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        request.status.includes('Approved by Commission') 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {request.status.includes('Approved by Commission') ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed ✓
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected ✗
                          </>
                        )}
                      </span>
                    )}
                  </h3>
                  {(request.status.includes('Approved by Commission') || request.status.includes('Rejected by Commission')) && (
                    <div className="text-xs text-muted-foreground">
                      Final Decision
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Type: {request.retirementType}</p>
                <p className="text-sm text-muted-foreground">Proposed Date: {request.proposedDate ? format(parseISO(request.proposedDate), 'PPP') : 'N/A'}</p>
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
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
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
                <CardTitle>Review Retirement Requests</CardTitle>
                <CardDescription>Review, approve, or reject pending retirement requests.</CardDescription>
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      Retirement Request for: {request.Employee.name} (ZanID: {request.Employee.zanId})
                      {(request.status.includes('Approved by Commission') || request.status.includes('Rejected by Commission')) && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          request.status.includes('Approved by Commission') 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {request.status.includes('Approved by Commission') ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed ✓
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected ✗
                            </>
                          )}
                        </span>
                      )}
                    </h3>
                    {(request.status.includes('Approved by Commission') || request.status.includes('Rejected by Commission')) && (
                      <div className="text-xs text-muted-foreground">
                        Final Decision
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Type: {request.retirementType}</p>
                  <p className="text-sm text-muted-foreground">Proposed Date: {request.proposedDate ? format(parseISO(request.proposedDate), 'PPP') : 'N/A'}</p>
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
              <p className="text-muted-foreground">No retirement requests pending your review.</p>
            )}
             <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
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
                Retirement request for <strong>{selectedRequest.Employee.name}</strong> (ZanID: {selectedRequest.Employee.zanId}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
                <div className="space-y-1 border-b pb-3 mb-3">
                    <h4 className="font-semibold text-base text-foreground mb-2">Employee Information</h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Full Name:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.name}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">ZanID:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.zanId}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Payroll #:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.payrollNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">ZSSF #:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.zssfNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Department:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.department}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Cadre/Position:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.cadre}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Employment Date:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.employmentDate ? format(parseISO(selectedRequest.Employee.employmentDate), 'PPP') : 'N/A'}</p></div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Date of Birth:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.dateOfBirth ? format(parseISO(selectedRequest.Employee.dateOfBirth), 'PPP') : 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                        <Label className="text-right text-muted-foreground">Institution:</Label>
                        <p className="col-span-2 font-medium text-foreground">{selectedRequest.Employee.institution?.name || 'N/A'}</p>
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
                          const fileName = objectKey.split('/').pop() || objectKey;
                          const shortName = getShortDocumentName(objectKey);
                          return (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground truncate" title={fileName}>{shortName}</span>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreviewFile(objectKey)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    variant="outline"
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reject Retirement Request: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Please provide the reason for rejecting the retirement request for <strong>{currentRequestToAction.Employee.name}</strong>. This reason will be visible to the HRO.
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
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correct & Resubmit Retirement Request</DialogTitle>
              <DialogDescription>
                Please update the details and upload corrected documents for <strong>{requestToCorrect.Employee.name}</strong> (ZanID: {requestToCorrect.Employee.zanId}).
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
                
                {correctedRetirementType !== 'illness' && (
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
                )}

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
                  <Label className="flex items-center mb-2">
                    <FileText className="mr-2 h-4 w-4 text-primary" />Upload Letter of Request (Required)
                  </Label>
                  <FileUpload
                    folder="retirement"
                    value={correctedLetterOfRequestFile}
                    onChange={setCorrectedLetterOfRequestFile}
                    onPreview={handlePreviewFile}
                    required
                  />
                </div>
                
                {correctedRetirementType === 'illness' && (
                  <>
                    <div>
                      <Label className="flex items-center mb-2">
                        <Stethoscope className="mr-2 h-4 w-4 text-primary" />Upload Medical Form (Required)
                      </Label>
                      <FileUpload
                        folder="retirement"
                        value={correctedMedicalFormFile}
                        onChange={setCorrectedMedicalFormFile}
                        onPreview={handlePreviewFile}
                        required
                      />
                    </div>
                    <div>
                      <Label className="flex items-center mb-2">
                        <FileText className="mr-2 h-4 w-4 text-primary" />Upload Illness Leave Letter (Optional)
                      </Label>
                      <FileUpload
                        folder="retirement"
                        value={correctedIllnessLeaveLetterFile}
                        onChange={setCorrectedIllnessLeaveLetterFile}
                        onPreview={handlePreviewFile}
                      />
                    </div>
                  </>
                )}

                {showCorrectedDelayFields && (
                  <div>
                    <Label className="flex items-center mb-2">
                      <ClipboardCheck className="mr-2 h-4 w-4 text-primary" />Upload Delay Document (Optional)
                    </Label>
                    <FileUpload
                      folder="retirement"
                      value={correctedDelayDocumentFile}
                      onChange={setCorrectedDelayDocumentFile}
                      onPreview={handlePreviewFile}
                    />
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

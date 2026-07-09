'use client';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowSteps } from '@/components/shared/workflow-steps';
import type { WorkflowStep } from '@/components/shared/workflow-steps';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  FileText,
  CalendarDays,
  Paperclip,
  ShieldAlert,
  FileWarning,
  PauseOctagon,
  Files,
  Ban,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { apiClient } from '@/lib/api-client';
import { EmployeeSearch } from '@/components/shared/employee-search';

interface SeparationRequest {
  id: string;
  Employee?: Partial<Employee & User & { Institution: { name: string } }>; // API returns this (capital E)
  employee?: Partial<Employee & User & { institution: { name: string } }>; // Keep for compatibility
  submittedBy: Partial<User>;
  submittedById?: string;
  reviewedBy?: Partial<User> | null;
  reviewedById?: string | null;
  hrrpReviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  decisionDate?: string | null;
  commissionDecisionDate?: string | null;
  commissionLetterKey?: string | null;
  hrrpReviewedAt?: string | null;
  createdAt: string;
  type: 'TERMINATION' | 'DISMISSAL';
  reason: string;
  documents: string[];
}

function getTerminationWorkflowSteps(status: string): WorkflowStep[] {
  return [
    {
      label: 'HRO Submit',
      status: status === 'Pending'
        ? 'active'
        : ['Rejected by HRRP - Awaiting HRO Correction', 'Rejected by HRMO - Awaiting HRO Correction', 'Rejected by HHRMD - Awaiting HRO Correction'].includes(status)
          ? 'rejected'
          : 'completed',
    },
    {
      label: 'HRRP Review',
      status: status === 'Pending HRRP Review'
        ? 'active'
        : status === 'Rejected by HRRP - Awaiting HRO Correction'
          ? 'rejected'
          : status === 'Pending HRMO/HHRMD Review' ||
            status === 'Approved by HRRP - Awaiting Commission Review'
            ? 'completed'
            : status.includes('Awaiting Commission') ||
              status.includes('Approved by Commission') ||
              status.includes('Rejected by Commission') ||
              status === 'Approved by HRMO - Awaiting Commission Decision' ||
              status === 'Approved by HHRMD - Awaiting Commission Decision' ||
              status === 'Request Received – Awaiting Commission Decision'
              ? 'completed'
              : status.includes('Rejected by')
                ? 'rejected'
                : 'pending',
    },
    {
      label: status.includes('Approved by HRMO')
        ? 'HRMO ✓'
        : status.includes('Approved by HHRMD')
          ? 'HHRMD ✓'
          : 'HRMO/HHRMD Review',
      status: status.includes('Approved by HRMO') || status.includes('Approved by HHRMD')
        ? 'completed'
        : status === 'Rejected by HRMO - Awaiting HRO Correction'
          ? 'rejected'
          : status === 'Rejected by HHRMD - Awaiting HRO Correction'
            ? 'rejected'
            : status === 'Approved by HRRP - Awaiting Commission Review' ||
              status === 'Pending HRMO/HHRMD Review'
              ? 'active'
              : status === 'Request Received – Awaiting Commission Decision' ||
                status.includes('Awaiting Commission Decision') ||
                status.includes('Approved by Commission') ||
                status.includes('Rejected by Commission')
                ? 'completed'
                : 'pending',
    },
    {
      label: 'Commission Decision',
      status: status.includes('Approved by Commission') ||
             status === 'Rejected by Commission - Request Concluded'
        ? 'completed'
        : status === 'Request Received – Awaiting Commission Decision' ||
          status.includes('Awaiting Commission')
          ? 'active'
          : 'pending',
    },
  ];
}

export default function TerminationAndDismissalPage() {
  const { role, user } = useAuth();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [employeeStatus, setEmployeeStatus] = useState<
    'probation' | 'confirmed' | null
  >(null);
  const [hasPendingTermination, setHasPendingTermination] = useState(false);

  const [reason, setReason] = useState('');

  // Common compulsory document
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  // Termination (probation) documents
  const [terminationSupportingDocFile, setTerminationSupportingDocFile] =
    useState<string>('');

  // Dismissal (confirmed) documents
  const [misconductEvidenceFile, setMisconductEvidenceFile] =
    useState<string>('');
  const [summonNoticeFile, setSummonNoticeFile] = useState<string>('');
  const [suspensionLetterFile, setSuspensionLetterFile] = useState<string>('');
  const [warningLettersFile, setWarningLettersFile] = useState<string>('');
  const [employeeExplanationLetterFile, setEmployeeExplanationLetterFile] =
    useState<string>('');
  const [otherAdditionalDocumentsFile, setOtherAdditionalDocumentsFile] =
    useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<SeparationRequest[]>(
    []
  );
  const [selectedRequest, setSelectedRequest] =
    useState<SeparationRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

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

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] =
    useState<SeparationRequest | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [commissionDecisionType, setCommissionDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [commissionDecisionRequestId, setCommissionDecisionRequestId] = useState<string | null>(null);
  const [commissionLetterFile, setCommissionLetterFile] = useState<string>('');
  const [commissionRejectionReason, setCommissionRejectionReason] = useState('');
  const [isCommissionSubmitting, setIsCommissionSubmitting] = useState(false);

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] =
    useState<SeparationRequest | null>(null);
  const [correctedReason, setCorrectedReason] = useState('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] =
    useState<string>('');
  const [correctedSupportingDocumentFile, setCorrectedSupportingDocumentFile] =
    useState<string>('');

  // Dismissal correction document states
  const [correctedMisconductEvidenceFile, setCorrectedMisconductEvidenceFile] =
    useState<string>('');
  const [correctedSummonNoticeFile, setCorrectedSummonNoticeFile] =
    useState<string>('');
  const [correctedSuspensionLetterFile, setCorrectedSuspensionLetterFile] =
    useState<string>('');
  const [correctedWarningLettersFile, setCorrectedWarningLettersFile] =
    useState<string>('');
  const [
    correctedEmployeeExplanationLetterFile,
    setCorrectedEmployeeExplanationLetterFile,
  ] = useState<string>('');
  const [
    correctedOtherAdditionalDocumentsFile,
    setCorrectedOtherAdditionalDocumentsFile,
  ] = useState<string>('');

  // Employee status validation
  const isEmployeeTerminated = employeeDetails?.status === 'Terminated';
  const isEmployeeDismissed = employeeDetails?.status === 'Dismissed';
  const cannotSubmitTermination = isEmployeeTerminated || isEmployeeDismissed;

  const fetchRequests = useCallback(
    async (isRefresh = false, page = currentPage) => {
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
          size: itemsPerPage.toString(),
        });

        // Add status filter if not 'all'
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        // Add cache-busting parameter for refresh
        if (isRefresh) {
          params.append('_t', Date.now().toString());
        }

        const response = await fetch(`/api/termination?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': isRefresh
              ? 'no-cache, no-store, must-revalidate'
              : 'default',
            Pragma: isRefresh ? 'no-cache' : 'default',
            Expires: isRefresh ? '0' : 'default',
          },
        });
        if (!response.ok)
          throw new Error('Failed to fetch separation requests');
        const result = await response.json();

        // Handle both array and paginated object responses
        let requests = [];
        if (Array.isArray(result)) {
          requests = result;
          setTotalItems(result.length);
          setTotalPages(Math.ceil(result.length / itemsPerPage));
        } else if (result.data && Array.isArray(result.data)) {
          requests = result.data;
          setTotalItems(result.pagination?.total || result.data.length);
          setTotalPages(
            result.pagination?.totalPages ||
              Math.ceil(
                (result.pagination?.total || result.data.length) / itemsPerPage
              )
          );
        }

        setPendingRequests(requests);
        if (isRefresh) {
          toast({
            title: 'Refreshed',
            description: 'Request list has been updated.',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load separation requests.',
          variant: 'destructive',
        });
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [user, role, currentPage, itemsPerPage, statusFilter]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, currentPage, statusFilter]);

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
    setHasPendingTermination(false);
  };

  const isSubmitButtonDisabled = () => {
    if (
      !employeeDetails ||
      !employeeStatus ||
      !reason.trim() ||
      letterOfRequestFile === '' ||
      cannotSubmitTermination ||
      hasPendingTermination ||
      isSubmitting
    ) {
      return true;
    }

    if (employeeStatus === 'probation') {
      // For termination, need supporting document
      return terminationSupportingDocFile === '';
    } else {
      // For dismissal, need required documents
      return (
        misconductEvidenceFile === '' ||
        summonNoticeFile === '' ||
        suspensionLetterFile === ''
      );
    }
  };

  const handleEmployeeFound = (employee: Employee) => {
    resetFormFields();
    setEmployeeDetails(employee);
    setEmployeeStatus(
      employee.status === 'On Probation' ? 'probation' : 'confirmed'
    );

    // Check for pending termination/dismissal request
    const pendingStatuses = [
      'Pending HRRP Review',
      'Pending HRMO/HHRMD Review',
      'Pending DO/HHRMD Review',
      'Approved by HRRP - Awaiting Commission Review',
      'Request Received – Awaiting Commission Decision',
    ];

    console.log('[TERMINATION] Checking for pending requests:', {
      employeeId: employee.id,
      totalRequests: pendingRequests.length,
    });

    // Log all requests for this employee to debug
    const matchingRequests = pendingRequests.filter((req) => {
      const employeeId = (req as any).Employee?.id || req.employee?.id;
      return employeeId === employee.id;
    });

    console.log('[TERMINATION] Matching requests for employee:', {
      employeeId: employee.id,
      matchingCount: matchingRequests.length,
      matchingRequests: matchingRequests.map((r) => ({
        id: r.id,
        status: r.status,
        reviewStage: r.reviewStage,
        type: r.type,
      })),
    });

    // API returns 'Employee' (capital E), check both for compatibility
    const hasPending = matchingRequests.some((req) =>
      pendingStatuses.includes(req.status)
    );

    console.log('[TERMINATION] Has pending result:', {
      hasPending,
      pendingStatuses,
    });

    setHasPendingTermination(hasPending);
  };

  const handleEmployeeClear = () => {
    setEmployeeDetails(null);
    setEmployeeStatus(null);
    resetFormFields();
    setHasPendingTermination(false);
  };

  const handleUpdateRequest = async (
    requestId: string,
    payload: any,
    actionDescription?: string
  ) => {
    // Get request info for immediate feedback
    const request = pendingRequests.find((req) => req.id === requestId);

    // Optimistic update - immediately show new status
    const optimisticUpdate = pendingRequests.map((req) =>
      req.id === requestId
        ? { ...req, ...payload, updatedAt: new Date().toISOString() }
        : req
    );
    setPendingRequests(optimisticUpdate);

    // Show immediate success feedback
    if (actionDescription && request) {
      toast({
        title: 'Status Updated',
        description: `${actionDescription} for ${request.Employee?.name || 'employee'}. Status: ${payload.status}`,
        duration: 3000,
      });
    }

    try {
      // Build the PATCH body - only include reviewedById for non-HRRP actions
      const patchBody: any = {
        id: requestId,
        userRole: role,
        userId: user?.id,
        ...payload,
      };
      // HRRP actions use hrrpReviewedById, not reviewedById
      if (!payload.hrrpReviewedById) {
        patchBody.reviewedById = user?.id;
      }

      const response = await fetchWithCsrf(`/api/termination`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      if (!response.ok) throw new Error('Failed to update request');

      // Force immediate refresh to get accurate data from server
      await fetchRequests();
      return true;
    } catch (error) {
      // Revert optimistic update on error
      await fetchRequests();
      toast({
        title: 'Update Failed',
        description: 'Could not update the request.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSubmitRequest = async () => {
    if (!employeeDetails || !employeeStatus || !user) {
      toast({
        title: 'Submission Error',
        description: 'Employee details are missing.',
        variant: 'destructive',
      });
      return;
    }

    if (cannotSubmitTermination) {
      const message = isEmployeeTerminated
        ? 'Cannot request termination for employees who are already terminated.'
        : 'Cannot request dismissal for employees who are already dismissed.';

      toast({
        title: 'Termination/Dismissal Not Applicable',
        description: message,
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    // Validation checks...

    const documentObjectKeys: string[] = [];
    let type: 'TERMINATION' | 'DISMISSAL';

    // Add letter of request (always required)
    if (letterOfRequestFile) documentObjectKeys.push(letterOfRequestFile);

    if (employeeStatus === 'probation') {
      type = 'TERMINATION';
      if (terminationSupportingDocFile)
        documentObjectKeys.push(terminationSupportingDocFile);
    } else {
      type = 'DISMISSAL';
      if (misconductEvidenceFile)
        documentObjectKeys.push(misconductEvidenceFile);
      if (summonNoticeFile) documentObjectKeys.push(summonNoticeFile);
      if (suspensionLetterFile) documentObjectKeys.push(suspensionLetterFile);
      if (warningLettersFile) documentObjectKeys.push(warningLettersFile);
      if (employeeExplanationLetterFile)
        documentObjectKeys.push(employeeExplanationLetterFile);
      if (otherAdditionalDocumentsFile)
        documentObjectKeys.push(otherAdditionalDocumentsFile);
    }

    setIsSubmitting(true);

    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRRP Review',
      reviewStage: 'initial',
      reason: reason,
      type,
      documents: documentObjectKeys,
    };

    try {
      const response = await fetchWithCsrf('/api/termination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to submit request');

      await fetchRequests(); // Refresh list
      toast({
        title: 'Request Submitted',
        description: `${type} request for ${employeeDetails.name} submitted successfully.`,
      });
      setEmployeeDetails(null);
      resetFormFields();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Could not submit the request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitialAction = async (
    requestId: string,
    action: 'forward' | 'reject'
  ) => {
    const request = pendingRequests.find((req) => req.id === requestId);
    if (!request) return;

    if (action === 'reject') {
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    } else if (action === 'forward') {
      const payload = {
        status: 'Request Received – Awaiting Commission Decision',
        reviewStage: 'commission_review',
        decisionDate: new Date().toISOString(),
      };
      await handleUpdateRequest(
        requestId,
        payload,
        `Request verified and forwarded to Commission`
      );
    }
  };

  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim() || !user)
      return;

    let rejectionStatus: string;
    if (role === ROLES.HRRP) {
      rejectionStatus = 'Rejected by HRRP - Awaiting HRO Correction';
    } else {
      rejectionStatus = `Rejected by ${role} - Awaiting HRO Correction`;
    }

    const payload = {
      status: rejectionStatus,
      rejectionReason: rejectionReasonInput,
      reviewStage: 'initial',
    };
    const success = await handleUpdateRequest(
      currentRequestToAction.id,
      payload,
      `Request rejected and returned to HRO`
    );
    if (success) {
      setIsRejectionModalOpen(false);
      setCurrentRequestToAction(null);
      setRejectionReasonInput('');
    }
  };

  const handleCommissionDecision = (
    requestId: string,
    decision: 'approved' | 'rejected'
  ) => {
    setCommissionDecisionRequestId(requestId);
    setCommissionDecisionType(decision);
    setCommissionLetterFile('');
    setCommissionRejectionReason('');
    setIsCommissionDecisionModalOpen(true);
  };

  const handleCommissionDecisionSubmit = async () => {
    if (!commissionDecisionRequestId || !commissionDecisionType || !user) return;

    if (!commissionLetterFile) {
      toast({
        title: 'Commission Letter Required',
        description: 'Please upload the official commission letter (Barua Rasmi ya Tume) before making a decision.',
        variant: 'destructive',
      });
      return;
    }

    if (commissionDecisionType === 'rejected' && !commissionRejectionReason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejecting this request.',
        variant: 'destructive',
      });
      return;
    }

    setIsCommissionSubmitting(true);

    try {
      const finalStatus =
        commissionDecisionType === 'approved'
          ? 'Approved by Commission'
          : 'Rejected by Commission - Request Concluded';

      const payload: any = {
        status: finalStatus,
        reviewStage: 'completed',
        decisionDate: new Date().toISOString(),
        commissionDecisionDate: new Date().toISOString(),
        reviewedById: user.id,
        commissionLetterKey: commissionLetterFile,
      };

      if (commissionDecisionType === 'rejected') {
        payload.rejectionReason = commissionRejectionReason;
      }

      const actionDescription = commissionDecisionType === 'approved'
        ? 'Termination/Dismissal approved by Commission!'
        : 'Termination/Dismissal rejected by Commission';

      await handleUpdateRequest(
        commissionDecisionRequestId,
        payload,
        actionDescription
      );

      setIsCommissionDecisionModalOpen(false);
      setCommissionDecisionType(null);
      setCommissionDecisionRequestId(null);
      setCommissionLetterFile('');
      setCommissionRejectionReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit commission decision.',
        variant: 'destructive',
      });
    } finally {
      setIsCommissionSubmitting(false);
    }
  };

  const handleHrrpAction = async (
    requestId: string,
    action: 'forward' | 'reject'
  ) => {
    if (!user) return;

    if (action === 'reject') {
      const request = pendingRequests.find((req) => req.id === requestId);
      if (!request) return;
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
      return;
    }

    // Forward to commission (HRRP approves)
    const payload = {
      status: 'Approved by HRRP - Awaiting Commission Review',
      reviewStage: 'hrrp_review',
      hrrpReviewedById: user.id,
      hrrpReviewedAt: new Date().toISOString(),
    };

    await handleUpdateRequest(
      requestId,
      payload,
      'Approved by HRRP and forwarded to Commission for review'
    );
  };

  const handleCorrection = (request: SeparationRequest) => {
    setRequestToCorrect(request);
    setCorrectedReason(request.reason || '');
    setCorrectedLetterOfRequestFile('');
    setCorrectedSupportingDocumentFile('');

    // Reset dismissal document states
    setCorrectedMisconductEvidenceFile('');
    setCorrectedSummonNoticeFile('');
    setCorrectedSuspensionLetterFile('');
    setCorrectedWarningLettersFile('');
    setCorrectedEmployeeExplanationLetterFile('');
    setCorrectedOtherAdditionalDocumentsFile('');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => ((input as HTMLInputElement).value = ''));

    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: SeparationRequest | null) => {
    if (!request || !user) {
      toast({
        title: 'Error',
        description: 'Request or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    // Validation based on request type
    if (!correctedReason || !correctedLetterOfRequestFile) {
      toast({
        title: 'Validation Error',
        description:
          'Please fill all required fields and upload required documents.',
        variant: 'destructive',
      });
      return;
    }

    // Additional validation for dismissal requests
    if (request.type === 'DISMISSAL') {
      if (
        !correctedMisconductEvidenceFile ||
        !correctedSummonNoticeFile ||
        !correctedSuspensionLetterFile
      ) {
        toast({
          title: 'Validation Error',
          description:
            'For dismissal requests, please upload all required documents: Misconduct Evidence, Summon Notice, and Suspension Letter.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Optimistic update to immediately hide the "Correct & Resubmit" button and show new status
    const optimisticUpdate = pendingRequests.map((req) =>
      req.id === request.id
        ? {
            ...req,
            status: 'Pending HRRP Review',
            reviewStage: 'initial',
            rejectionReason: null,
            reason: correctedReason,
            updatedAt: new Date().toISOString(),
          }
        : req
    );
    setPendingRequests(optimisticUpdate);

    // Show immediate success feedback
    toast({
      title: 'Request Corrected & Resubmitted',
      description: `${request.type} request for ${request.Employee?.name || 'employee'} has been corrected and resubmitted. Status: Pending HRRP Review`,
      duration: 4000,
    });

    // Close modal immediately for better UX
    setIsCorrectionModalOpen(false);
    setRequestToCorrect(null);

    const documentsList: string[] = [];
    // Add the actual file object keys from uploads
    if (correctedLetterOfRequestFile)
      documentsList.push(correctedLetterOfRequestFile);

    // Add documents based on request type
    if (request.type === 'DISMISSAL') {
      // Required dismissal documents
      if (correctedMisconductEvidenceFile)
        documentsList.push(correctedMisconductEvidenceFile);
      if (correctedSummonNoticeFile)
        documentsList.push(correctedSummonNoticeFile);
      if (correctedSuspensionLetterFile)
        documentsList.push(correctedSuspensionLetterFile);

      // Optional dismissal documents
      if (correctedWarningLettersFile)
        documentsList.push(correctedWarningLettersFile);
      if (correctedEmployeeExplanationLetterFile)
        documentsList.push(correctedEmployeeExplanationLetterFile);
      if (correctedOtherAdditionalDocumentsFile)
        documentsList.push(correctedOtherAdditionalDocumentsFile);
    } else {
      // For termination requests
      if (correctedSupportingDocumentFile)
        documentsList.push(correctedSupportingDocumentFile);
    }

    try {
      const response = await fetchWithCsrf(`/api/termination`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRRP Review',
          reviewStage: 'initial',
          reason: correctedReason,
          documents: documentsList,
          rejectionReason: null,
          reviewedById: user.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to update request');

      // Force refresh to get accurate server data
      await fetchRequests();
    } catch (error) {
      // Revert optimistic update on error and show error feedback
      await fetchRequests();
      console.error('[RESUBMIT_TERMINATION]', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update the request.',
        variant: 'destructive',
      });
    }
  };

  const paginatedRequests = pendingRequests || [];

  return (
    <div>
      <PageHeader
        title="Termination and Dismissal"
        description="Process employee terminations for probationers and dismissals for confirmed staff."
      />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Termination or Dismissal Request</CardTitle>
            <CardDescription>
              Search for an employee by ZANID or Payroll Number. The required
              form will appear based on the employee's status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EmployeeSearch
              onEmployeeFound={handleEmployeeFound}
              onClear={handleEmployeeClear}
              disabled={isSubmitting}
            />

            {employeeDetails && employeeStatus && (
              <div className="space-y-6 pt-2">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-foreground">
                    Employee Details
                  </h3>
                  <div className="p-4 rounded-md border bg-secondary/20 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Name:</Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">ZanID:</Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.zanId}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Payroll Number:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.payrollNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          ZSSF Number:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.zssfNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Department:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.department || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Cadre/Position:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.cadre || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Employment Date:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.employmentDate
                            ? format(
                                typeof employeeDetails.employmentDate ===
                                  'string'
                                  ? parseISO(employeeDetails.employmentDate)
                                  : employeeDetails.employmentDate,
                                'MMMM do, yyyy'
                              )
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Date of Birth:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeDetails.dateOfBirth
                            ? format(
                                typeof employeeDetails.dateOfBirth === 'string'
                                  ? parseISO(employeeDetails.dateOfBirth)
                                  : employeeDetails.dateOfBirth,
                                'MMMM do, yyyy'
                              )
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Institution:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {typeof employeeDetails.institution === 'object'
                            ? employeeDetails.institution?.name
                            : employeeDetails.institution || 'N/A'}
                        </p>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label className="text-muted-foreground">
                          Current Status:
                        </Label>{' '}
                        <p
                          className={`font-semibold ${cannotSubmitTermination ? 'text-destructive' : employeeDetails.status === 'On Probation' ? 'text-orange-600' : 'text-green-600'}`}
                        >
                          {employeeDetails.status || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {cannotSubmitTermination && (
                  <div className="flex items-center p-4 mt-2 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>
                      {isEmployeeTerminated &&
                        'Cannot request termination for employees who are already terminated.'}
                      {isEmployeeDismissed &&
                        'Cannot request dismissal for employees who are already dismissed.'}
                    </span>
                  </div>
                )}

                {hasPendingTermination && (
                  <div className="flex items-center p-4 mt-2 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>
                      A termination/dismissal request for this employee is
                      already being reviewed. You cannot submit another request
                      until the current one is completed.
                    </span>
                  </div>
                )}

                {!cannotSubmitTermination && !hasPendingTermination && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">
                      More Details ...
                    </h3>
                    <div>
                      <Label htmlFor="reason">Reason for Firing</Label>
                      <Textarea
                        id="reason"
                        placeholder="Clearly state the grounds for firing..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={
                          isSubmitting ||
                          cannotSubmitTermination ||
                          hasPendingTermination
                        }
                      />
                    </div>

                    {/* Common Document */}
                    <div>
                      <Label
                        htmlFor="letterOfRequestFile"
                        className="flex items-center"
                      >
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Letter of Request (Required, PDF)
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={letterOfRequestFile}
                        onChange={(key) =>
                          setLetterOfRequestFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                        disabled={
                          isSubmitting ||
                          cannotSubmitTermination ||
                          hasPendingTermination
                        }
                        required
                      />
                    </div>

                    {/* Termination Documents (for probationers) */}
                    {employeeStatus === 'probation' && (
                      <div>
                        <Label
                          htmlFor="terminationSupportingDocFile"
                          className="flex items-center"
                        >
                          <Paperclip className="mr-2 h-4 w-4 text-primary" />
                          Upload Supporting Document for Termination (Required,
                          PDF)
                        </Label>
                        <FileUpload
                          folder="termination"
                          value={terminationSupportingDocFile}
                          onChange={(key) =>
                            setTerminationSupportingDocFile(
                              Array.isArray(key) ? key[0] : key
                            )
                          }
                          onPreview={handlePreviewFile}
                          disabled={
                            isSubmitting ||
                            cannotSubmitTermination ||
                            hasPendingTermination
                          }
                          required
                        />
                      </div>
                    )}

                    {/* Dismissal Documents (for confirmed employees) */}
                    {employeeStatus === 'confirmed' && (
                      <>
                        <h4 className="text-md font-medium text-foreground pt-2">
                          Required Dismissal Documents (PDF Only)
                        </h4>
                        <div>
                          <Label
                            htmlFor="misconductEvidenceFile"
                            className="flex items-center"
                          >
                            <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                            Upload Misconduct Evidence &amp; Primary
                            Investigation Report
                          </Label>
                          <FileUpload
                            folder="termination"
                            value={misconductEvidenceFile}
                            onChange={(key) =>
                              setMisconductEvidenceFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            onPreview={handlePreviewFile}
                            disabled={
                              isSubmitting ||
                              cannotSubmitTermination ||
                              hasPendingTermination
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="summonNoticeFile"
                            className="flex items-center"
                          >
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            Upload Summon Notice / Invitation Letter
                          </Label>
                          <FileUpload
                            folder="termination"
                            value={summonNoticeFile}
                            onChange={(key) =>
                              setSummonNoticeFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            onPreview={handlePreviewFile}
                            disabled={
                              isSubmitting ||
                              cannotSubmitTermination ||
                              hasPendingTermination
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="suspensionLetterFile"
                            className="flex items-center"
                          >
                            <PauseOctagon className="mr-2 h-4 w-4 text-red-500" />
                            Upload Suspension Letter
                          </Label>
                          <FileUpload
                            folder="termination"
                            value={suspensionLetterFile}
                            onChange={(key) =>
                              setSuspensionLetterFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            onPreview={handlePreviewFile}
                            disabled={
                              isSubmitting ||
                              cannotSubmitTermination ||
                              hasPendingTermination
                            }
                            required
                          />
                        </div>
                        <h4 className="text-md font-medium text-foreground pt-2">
                          Optional Supporting Documents (PDF Only)
                        </h4>
                        <div>
                          <Label
                            htmlFor="warningLettersFile"
                            className="flex items-center"
                          >
                            <FileWarning className="mr-2 h-4 w-4 text-orange-500" />
                            Upload Warning Letter(s)
                          </Label>
                          <FileUpload
                            folder="termination"
                            value={warningLettersFile}
                            onChange={(key) =>
                              setWarningLettersFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            onPreview={handlePreviewFile}
                            disabled={
                              isSubmitting ||
                              cannotSubmitTermination ||
                              hasPendingTermination
                            }
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="employeeExplanationLetterFile"
                            className="flex items-center"
                          >
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            Upload Employee Explanation Letter
                          </Label>
                          <FileUpload
                            folder="termination"
                            value={employeeExplanationLetterFile}
                            onChange={(key) =>
                              setEmployeeExplanationLetterFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            onPreview={handlePreviewFile}
                            disabled={
                              isSubmitting ||
                              cannotSubmitTermination ||
                              hasPendingTermination
                            }
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="otherAdditionalDocumentsFile"
                            className="flex items-center"
                          >
                            <Files className="mr-2 h-4 w-4 text-primary" />
                            Upload Other Additional Documents
                          </Label>
                          <FileUpload
                            folder="termination"
                            value={otherAdditionalDocumentsFile}
                            onChange={(key) =>
                              setOtherAdditionalDocumentsFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            onPreview={handlePreviewFile}
                            disabled={
                              isSubmitting ||
                              cannotSubmitTermination ||
                              hasPendingTermination
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {employeeDetails &&
            employeeStatus &&
            !cannotSubmitTermination &&
            !hasPendingTermination && (
              <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button
                  onClick={handleSubmitRequest}
                  disabled={isSubmitButtonDisabled()}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit{' '}
                  {employeeStatus === 'probation' ? 'Termination' : 'Dismissal'}{' '}
                  Request
                </Button>
              </CardFooter>
            )}
        </Card>
      )}

      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Your Submitted Termination & Dismissal Requests
                </CardTitle>
                <CardDescription>
                  Track the status of termination and dismissal requests you
                  have submitted.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRequests(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={statusFilter === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setCurrentPage(1);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      {request.type} for: {request.Employee?.name || 'N/A'}{' '}
                      (ZanID: {request.Employee?.zanId || 'N/A'})
                      {(request.status.includes('Approved by Commission') ||
                        request.status.includes('Rejected by Commission')) && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            request.status.includes('Approved by Commission')
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
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
                    {(request.status.includes('Approved by Commission') ||
                      request.status.includes('Rejected by Commission')) && (
                      <div className="text-xs text-muted-foreground">
                        Final Decision
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reason: {request.reason}
                  </p>
                  {role !== ROLES.HRO && (
                    <p className="text-sm text-muted-foreground">
                      Institution:{' '}
                      {request.Employee?.Institution?.name || 'N/A'}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Submitted:{' '}
                    {request.createdAt
                      ? format(parseISO(request.createdAt), 'PPP')
                      : 'N/A'}{' '}
                    by {request.submittedBy?.name || 'N/A'}
                  </p>
                  {request.hrrpReviewedBy && (
                    <p className="text-sm text-muted-foreground">
                      HRRP Reviewed by: {request.hrrpReviewedBy.name || 'N/A'} (
                      {request.hrrpReviewedBy.username || 'N/A'})
                    </p>
                  )}
                  <div className="flex items-center space-x-2">
                    <p className="text-sm">
                      <span className="font-medium">Status:</span>
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status.includes('Approved by Commission')
                          ? 'bg-green-100 text-green-800'
                          : request.status.includes('Rejected by Commission')
                            ? 'bg-red-100 text-red-800'
                            : request.status.includes('Awaiting Commission')
                              ? 'bg-blue-100 text-blue-800'
                              : request.status === 'Approved by HRRP - Awaiting Commission Review'
                                ? 'bg-orange-100 text-orange-800'
                                : request.status === 'Pending HRRP Review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : request.status.includes('Pending DO/HHRMD') || request.status.includes('Pending HRMO/HHRMD')
                                    ? 'bg-orange-100 text-orange-800'
                                    : request.status.includes('Awaiting HRO') || request.status.includes('Correction')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  {/* Workflow Progress Indicator */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Workflow:</span>
                      <div className="flex items-center space-x-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            request.status !== 'Pending'
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRO Submit</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            request.status === 'Approved by HRRP - Awaiting Commission Review' ||
                            request.status === 'Request Received – Awaiting Commission Decision' ||
                            request.status.includes('Approved by Commission') ||
                            request.status.includes('Rejected by Commission')
                              ? 'bg-green-500'
                              : request.status === 'Pending HRRP Review'
                                ? 'bg-purple-500'
                                : request.status === 'Rejected by HRRP - Awaiting HRO Correction'
                                  ? 'bg-red-500'
                                  : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRRP Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            request.status === 'Request Received – Awaiting Commission Decision' ||
                            request.status.includes('Approved by Commission') ||
                            request.status.includes('Rejected by Commission')
                              ? 'bg-green-500'
                              : request.status === 'Approved by HRRP - Awaiting Commission Review'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HHRMD/DO Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            ['Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status)
                              ? 'bg-green-500'
                              : request.status.includes('Awaiting Commission')
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">Commission Decision</span>
                      </div>
                    </div>
                  </div>
                  {request.rejectionReason && (
                    <p className="text-sm text-destructive">
                      <span className="font-medium">Rejection Reason:</span>{' '}
                      {request.rejectionReason}
                    </p>
                  )}
                  {/* Workflow Progress Indicator */}
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground font-medium mr-2">Workflow:</span>
                    <WorkflowSteps steps={getTerminationWorkflowSteps(request.status)} />
                  </div>
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    {(request.status.includes('Rejected') &&
                      request.status.includes('Awaiting HRO')) ||
                      request.status === 'Rejected by HRRP - Awaiting HRO Correction' ? (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleCorrection(request)}
                        >
                          Correct & Resubmit
                        </Button>
                      ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                No termination/dismissal requests found.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(role === ROLES.DO || role === ROLES.HHRMD || role === ROLES.CSCS || role === ROLES.HRRP) && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Review Termination &amp; Dismissal Requests
                </CardTitle>
                <CardDescription>
                  Review, approve, or reject pending requests.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRequests(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={statusFilter === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setCurrentPage(1);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((request) => (
                <div
                  key={request.id}
                  className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      {request.type} for: {request.Employee?.name || 'N/A'}{' '}
                      (ZanID: {request.Employee?.zanId || 'N/A'})
                      {(request.status.includes('Approved by Commission') ||
                        request.status.includes('Rejected by Commission')) && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            request.status.includes('Approved by Commission')
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
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
                    {(request.status.includes('Approved by Commission') ||
                      request.status.includes('Rejected by Commission')) && (
                      <div className="text-xs text-muted-foreground">
                        Final Decision
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reason: {request.reason}
                  </p>
                  {role !== ROLES.HRO && (
                    <p className="text-sm text-muted-foreground">
                      Institution:{' '}
                      {request.Employee?.Institution?.name || 'N/A'}
                    </p>
                  )}
                  {request.hrrpReviewedBy && (
                    <p className="text-sm text-muted-foreground">
                      HRRP Reviewed by: {request.hrrpReviewedBy.name || 'N/A'} (
                      {request.hrrpReviewedBy.username || 'N/A'})
                    </p>
                  )}
                  <div className="flex items-center space-x-2">
                    <p className="text-sm">
                      <span className="font-medium">Status:</span>
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        request.status.includes('Approved by Commission')
                          ? 'bg-green-100 text-green-800'
                          : request.status.includes('Rejected by Commission')
                            ? 'bg-red-100 text-red-800'
                            : request.status.includes('Awaiting Commission')
                              ? 'bg-blue-100 text-blue-800'
                              : request.status === 'Approved by HRRP - Awaiting Commission Review'
                                ? 'bg-orange-100 text-orange-800'
                                : request.status === 'Pending HRRP Review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : request.status.includes('Pending DO/HHRMD') || request.status.includes('Pending HRMO/HHRMD')
                                    ? 'bg-orange-100 text-orange-800'
                                    : request.status.includes('Awaiting HRO') || request.status.includes('Correction')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  {/* Workflow Progress Indicator */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Workflow:</span>
                      <div className="flex items-center space-x-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            request.status !== 'Pending'
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRO Submit</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            request.status === 'Approved by HRRP - Awaiting Commission Review' ||
                            request.status === 'Request Received – Awaiting Commission Decision' ||
                            request.status.includes('Approved by Commission') ||
                            request.status.includes('Rejected by Commission')
                              ? 'bg-green-500'
                              : request.status === 'Pending HRRP Review'
                                ? 'bg-purple-500'
                                : request.status === 'Rejected by HRRP - Awaiting HRO Correction'
                                  ? 'bg-red-500'
                                  : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRRP Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            request.status === 'Request Received – Awaiting Commission Decision' ||
                            request.status.includes('Approved by Commission') ||
                            request.status.includes('Rejected by Commission')
                              ? 'bg-green-500'
                              : request.status === 'Approved by HRRP - Awaiting Commission Review'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HHRMD/DO Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            ['Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status)
                              ? 'bg-green-500'
                              : request.status.includes('Awaiting Commission')
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">Commission Decision</span>
                      </div>
                    </div>
                  </div>
                  {request.rejectionReason && (
                    <p className="text-sm text-destructive">
                      <span className="font-medium">Rejection Reason:</span>{' '}
                      {request.rejectionReason}
                    </p>
                  )}
                  {/* Workflow Progress Indicator */}
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground font-medium mr-2">Workflow:</span>
                    <WorkflowSteps steps={getTerminationWorkflowSteps(request.status)} />
                  </div>
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    {role === ROLES.HRRP &&
                      request.status === 'Pending HRRP Review' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleHrrpAction(request.id, 'forward')}
                          >
                            Approve &amp; Forward to Commission
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleHrrpAction(request.id, 'reject')}
                          >
                            Reject &amp; Return to HRO
                          </Button>
                        </>
                      )}
                    {(role === ROLES.HHRMD || role === ROLES.DO) &&
                      request.status === 'Approved by HRRP - Awaiting Commission Review' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleInitialAction(request.id, 'forward')
                            }
                          >
                            Verify &amp; Forward to Commission
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleInitialAction(request.id, 'reject')
                            }
                          >
                            Reject &amp; Return to HRO
                          </Button>
                        </>
                      )}
                    {(role === ROLES.HHRMD || role === ROLES.DO) &&
                      request.reviewStage === 'commission_review' &&
                      request.status === 'Request Received – Awaiting Commission Decision' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() =>
                              handleCommissionDecision(request.id, 'approved')
                            }
                          >
                            Approved by Commission
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleCommissionDecision(request.id, 'rejected')
                            }
                          >
                            Rejected by Commission
                          </Button>
                        </>
                      )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                No requests pending your review.
              </p>
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
              <DialogTitle>
                {selectedRequest.type} Request Details: {selectedRequest.id}
              </DialogTitle>
              <DialogDescription>
                For <strong>{selectedRequest.Employee?.name || 'N/A'}</strong>{' '}
                (ZanID: {selectedRequest.Employee?.zanId || 'N/A'}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
              <div className="space-y-1 border-b pb-3 mb-3">
                <h4 className="font-semibold text-base text-foreground mb-2">
                  Employee Information
                </h4>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Name:
                  </Label>
                  <p className="col-span-2 font-medium">
                    {selectedRequest.Employee?.name}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    ZanID:
                  </Label>
                  <p className="col-span-2 font-medium">
                    {selectedRequest.Employee?.zanId}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Payroll #:
                  </Label>
                  <p className="col-span-2 font-medium">
                    {selectedRequest.Employee?.payrollNumber || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    ZSSF #:
                  </Label>
                  <p className="col-span-2 font-medium">
                    {selectedRequest.Employee?.zssfNumber || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Department:
                  </Label>
                  <p className="col-span-2 font-medium">
                    {selectedRequest.Employee?.department}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Institution:
                  </Label>
                  <p className="col-span-2 font-medium">
                    {typeof selectedRequest.Employee?.institution === 'object'
                      ? selectedRequest.Employee.institution?.name
                      : selectedRequest.Employee?.institution || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-base text-foreground mb-2">
                  Request Information
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label className="font-semibold">Reason Summary:</Label>
                    <p className="pl-2">{selectedRequest.reason}</p>
                  </div>
                  <p>
                    <Label className="font-semibold">Submitted:</Label>{' '}
                    {selectedRequest.createdAt
                      ? format(parseISO(selectedRequest.createdAt), 'PPP')
                      : 'N/A'}{' '}
                    by {selectedRequest.submittedBy?.name || 'N/A'}
                  </p>
                  {selectedRequest.hrrpReviewedBy && (
                    <p>
                      <Label className="font-semibold">HRRP Reviewed by:</Label>{' '}
                      {selectedRequest.hrrpReviewedBy.name || 'N/A'} (
                      {selectedRequest.hrrpReviewedBy.username || 'N/A'})
                    </p>
                  )}
                  <p>
                    <Label className="font-semibold">Status:</Label>{' '}
                    <span className="text-primary">
                      {selectedRequest.status}
                    </span>
                  </p>
                  {selectedRequest.rejectionReason && (
                    <div>
                      <Label className="font-semibold text-destructive">
                        Rejection Reason:
                      </Label>
                      <p className="pl-2 text-destructive">
                        {selectedRequest.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-3 mt-3 border-t">
                {/* Commission Letter */}
                {selectedRequest.commissionLetterKey && (
                  <div className="mb-4">
                    <Label className="font-semibold">Barua Rasmi ya Tume</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-md border bg-blue-50 dark:bg-blue-950/30 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-foreground">
                            Barua Rasmi ya Tume
                          </span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => handlePreviewFile(selectedRequest.commissionLetterKey!)}
                          >
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/files/download/${selectedRequest.commissionLetterKey}`,
                                  { credentials: 'include' }
                                );
                                if (response.ok) {
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = 'Barua-Rasmi-ya-Tume.pdf';
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } else {
                                  toast({
                                    title: 'Download Failed',
                                    description: 'Could not download the file. Please try again.',
                                    variant: 'destructive',
                                  });
                                }
                              } catch (error) {
                                console.error('Download failed:', error);
                                toast({
                                  title: 'Download Failed',
                                  description: 'Could not download the file. Please try again.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <Label className="font-semibold">Attached Documents</Label>
                <div className="mt-2 space-y-2">
                  {selectedRequest.documents &&
                  selectedRequest.documents.length > 0 ? (
                    selectedRequest.documents.map((objectKey, index) => {
                      const shortName = getShortDocumentName(objectKey);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span
                              className="font-medium text-foreground"
                              title={objectKey}
                            >
                              {shortName}
                            </span>
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
                                  const response = await fetch(
                                    `/api/files/download/${objectKey}`,
                                    {
                                      credentials: 'include',
                                    }
                                  );
                                  if (response.ok) {
                                    const blob = await response.blob();
                                    const url =
                                      window.URL.createObjectURL(blob);
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
                                      description:
                                        'Could not download the file. Please try again.',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (error) {
                                  console.error('Download failed:', error);
                                  toast({
                                    title: 'Download Failed',
                                    description:
                                      'Could not download the file. Please try again.',
                                    variant: 'destructive',
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
                    <p className="text-muted-foreground text-sm">
                      No documents were attached to this request.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {currentRequestToAction && (
        <Dialog
          open={isRejectionModalOpen}
          onOpenChange={setIsRejectionModalOpen}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Reject Request: {currentRequestToAction.id}
              </DialogTitle>
              <DialogDescription>
                Please provide the reason for rejecting the request for{' '}
                <strong>{currentRequestToAction.Employee?.name}</strong>. This
                reason will be visible to the HRO.
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
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectionModalOpen(false);
                  setCurrentRequestToAction(null);
                  setRejectionReasonInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectionSubmit}
                disabled={!rejectionReasonInput.trim()}
              >
                Submit Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Commission Decision Modal */}
      <Dialog open={isCommissionDecisionModalOpen} onOpenChange={setIsCommissionDecisionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {commissionDecisionType === 'approved' ? 'Approved by Commission' : 'Rejected by Commission'}
            </DialogTitle>
            <DialogDescription>
              {commissionDecisionType === 'approved'
                ? 'Pakia barua rasmi ya Tume ya kuidhinisha ombi hili.'
                : 'Pakia barua rasmi ya Tume ya kukataa ombi hili na toa sababu.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {commissionDecisionType === 'rejected' && (
              <div className="space-y-2">
                <Label className="font-semibold">Sababu ya Kukataa *</Label>
                <Textarea
                  value={commissionRejectionReason}
                  onChange={(e) => setCommissionRejectionReason(e.target.value)}
                  placeholder="Toa sababu ya kukataa ombi hili..."
                  rows={3}
                />
              </div>
            )}
            <div className="space-y-2">
              <FileUpload
                label="Barua Rasmi ya Tume *"
                description="Pakia barua rasmi ya Tume (PDF pekee, max 1MB)"
                accept=".pdf"
                maxSize={1}
                folder="termination/commission-letters"
                value={commissionLetterFile}
                onChange={(value) => setCommissionLetterFile(value as string)}
                onPreview={(objectKey) => {
                  setPreviewObjectKey(objectKey);
                  setIsPreviewModalOpen(true);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCommissionDecisionModalOpen(false)}
              disabled={isCommissionSubmitting}
            >
              Ghairi
            </Button>
            <Button
              className={commissionDecisionType === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              variant={commissionDecisionType === 'rejected' ? 'destructive' : 'default'}
              onClick={handleCommissionDecisionSubmit}
              disabled={
                isCommissionSubmitting ||
                !commissionLetterFile ||
                (commissionDecisionType === 'rejected' && !commissionRejectionReason.trim())
              }
            >
              {isCommissionSubmitting ? 'Inawasilisha...' : 'Wasilisha Uamuzi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {requestToCorrect && (
        <Dialog
          open={isCorrectionModalOpen}
          onOpenChange={setIsCorrectionModalOpen}
        >
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Correct {requestToCorrect.type} Request: {requestToCorrect.id}
              </DialogTitle>
              <DialogDescription>
                Update the details for{' '}
                <strong>{requestToCorrect.Employee?.name}</strong>'s{' '}
                {requestToCorrect.type.toLowerCase()} request and upload new
                documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="correctedReason">
                    Reason for {requestToCorrect.type}
                  </Label>
                  <Textarea
                    id="correctedReason"
                    placeholder="Provide detailed reason for the termination/dismissal"
                    value={correctedReason}
                    onChange={(e) => setCorrectedReason(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Common Document - Letter of Request */}
                <div>
                  <Label
                    htmlFor="correctedLetterOfRequest"
                    className="flex items-center"
                  >
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    Upload Letter of Request (Required, PDF Only)
                  </Label>
                  <FileUpload
                    folder="termination"
                    value={correctedLetterOfRequestFile}
                    onChange={(key) =>
                      setCorrectedLetterOfRequestFile(
                        Array.isArray(key) ? key[0] : key
                      )
                    }
                    onPreview={handlePreviewFile}
                    required
                  />
                </div>

                {/* Dismissal Documents */}
                {requestToCorrect.type === 'DISMISSAL' && (
                  <>
                    <h4 className="text-md font-medium text-foreground pt-2">
                      Required Dismissal Documents (PDF Only)
                    </h4>
                    <div>
                      <Label
                        htmlFor="correctedMisconductEvidenceFile"
                        className="flex items-center"
                      >
                        <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                        Upload Misconduct Evidence &amp; Primary Investigation
                        Report
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={correctedMisconductEvidenceFile}
                        onChange={(key) =>
                          setCorrectedMisconductEvidenceFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="correctedSummonNoticeFile"
                        className="flex items-center"
                      >
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Summon Notice / Invitation Letter
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={correctedSummonNoticeFile}
                        onChange={(key) =>
                          setCorrectedSummonNoticeFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="correctedSuspensionLetterFile"
                        className="flex items-center"
                      >
                        <PauseOctagon className="mr-2 h-4 w-4 text-red-500" />
                        Upload Suspension Letter
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={correctedSuspensionLetterFile}
                        onChange={(key) =>
                          setCorrectedSuspensionLetterFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                        required
                      />
                    </div>

                    <h4 className="text-md font-medium text-foreground pt-2">
                      Optional Supporting Documents (PDF Only)
                    </h4>
                    <div>
                      <Label
                        htmlFor="correctedWarningLettersFile"
                        className="flex items-center"
                      >
                        <FileWarning className="mr-2 h-4 w-4 text-orange-500" />
                        Upload Warning Letter(s)
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={correctedWarningLettersFile}
                        onChange={(key) =>
                          setCorrectedWarningLettersFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="correctedEmployeeExplanationLetterFile"
                        className="flex items-center"
                      >
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Employee Explanation Letter
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={correctedEmployeeExplanationLetterFile}
                        onChange={(key) =>
                          setCorrectedEmployeeExplanationLetterFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="correctedOtherAdditionalDocumentsFile"
                        className="flex items-center"
                      >
                        <Files className="mr-2 h-4 w-4 text-primary" />
                        Upload Other Additional Documents
                      </Label>
                      <FileUpload
                        folder="termination"
                        value={correctedOtherAdditionalDocumentsFile}
                        onChange={(key) =>
                          setCorrectedOtherAdditionalDocumentsFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        onPreview={handlePreviewFile}
                      />
                    </div>
                  </>
                )}

                {/* Termination Documents */}
                {requestToCorrect.type === 'TERMINATION' && (
                  <div>
                    <Label
                      htmlFor="correctedSupportingDocument"
                      className="flex items-center"
                    >
                      <Paperclip className="mr-2 h-4 w-4 text-primary" />
                      Upload Supporting Document for Termination (Optional, PDF
                      Only)
                    </Label>
                    <FileUpload
                      folder="termination"
                      value={correctedSupportingDocumentFile}
                      onChange={(key) =>
                        setCorrectedSupportingDocumentFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      onPreview={handlePreviewFile}
                    />
                  </div>
                )}
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
                disabled={
                  !correctedReason ||
                  correctedLetterOfRequestFile === '' ||
                  (requestToCorrect?.type === 'DISMISSAL' &&
                    (correctedMisconductEvidenceFile === '' ||
                      correctedSummonNoticeFile === '' ||
                      correctedSuspensionLetterFile === ''))
                }
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

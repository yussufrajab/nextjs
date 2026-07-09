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
import { FileUpload } from '@/components/ui/file-upload';
import { EmployeeSearch } from '@/components/shared/employee-search';
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
  AlertTriangle,
  CheckSquare,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Pagination } from '@/components/shared/pagination';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

interface LWOPRequest {
  id: string;
  Employee?: Partial<
    Employee &
      User & { institution: { name: string }; Institution: { name: string } }
  >; // API returns this (capital E)
  employee?: Partial<Employee & User & { institution: { name: string } }>; // Keep for compatibility
  submittedBy: Partial<User>;
  submittedById?: string;
  reviewedBy?: Partial<User> | null;
  hrrpReviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  duration: string;
  reason: string;
  documents: string[];
  decisionDate?: string | null;
  commissionDecisionDate?: string | null;
  commissionLetterKey?: string | null;
  hrrpReviewedAt?: string | null;
}

function getLwopWorkflowSteps(status: string): WorkflowStep[] {
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
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [letterOfRequestKey, setLetterOfRequestKey] = useState<string>('');
  const [employeeConsentLetterKey, setEmployeeConsentLetterKey] =
    useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<LWOPRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LWOPRequest | null>(
    null
  );
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] =
    useState<LWOPRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] = useState<LWOPRequest | null>(
    null
  );
  const [correctedStartDate, setCorrectedStartDate] = useState('');
  const [correctedEndDate, setCorrectedEndDate] = useState('');
  const [correctedDuration, setCorrectedDuration] = useState('');
  const [correctedReason, setCorrectedReason] = useState('');
  const [correctedLetterOfRequestKey, setCorrectedLetterOfRequestKey] =
    useState<string>('');
  const [
    correctedEmployeeConsentLetterKey,
    setCorrectedEmployeeConsentLetterKey,
  ] = useState<string>('');

  const [previewFileKey, setPreviewFileKey] = useState<string>('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [commissionDecisionType, setCommissionDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [commissionDecisionRequestId, setCommissionDecisionRequestId] = useState<string | null>(null);
  const [commissionLetterFile, setCommissionLetterFile] = useState<string>('');
  const [commissionRejectionReason, setCommissionRejectionReason] = useState('');
  const [isCommissionSubmitting, setIsCommissionSubmitting] = useState(false);

  const isEmployeeOnProbation = employeeDetails?.status === 'On Probation';
  const isEmployeeOnLWOP =
    employeeDetails?.status === 'On LWOP' || employeeDetails?.status === 'LWOP';

  // Check for existing pending LWOP requests for this employee
  const hasPendingLWOPRequest = employeeDetails
    ? pendingRequests.some((request) => {
        const employeeId = request.Employee?.id || request.employee?.id;
        return (
          employeeId === employeeDetails.id &&
          (request.status.includes('Pending') ||
            request.status.includes('Awaiting'))
        );
      })
    : false;

  const cannotSubmitLWOP =
    isEmployeeOnProbation || isEmployeeOnLWOP || hasPendingLWOPRequest;

  // Helper function to get employee from request (handles both Employee and employee)
  const getEmployeeFromRequest = (request: LWOPRequest) => {
    return request.Employee || request.employee;
  };

  // Handle file preview
  const handlePreviewFile = (objectKey: string) => {
    setPreviewFileKey(objectKey);
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

  // Calculate duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start < end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.ceil(diffDays / 30);

        const durationStr =
          diffMonths === 1 ? '1 month' : `${diffMonths} months`;
        setDuration(durationStr);
      } else {
        setDuration('');
      }
    } else {
      setDuration('');
    }
  }, [startDate, endDate]);

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

        const response = await fetch(`/api/lwop?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': isRefresh
              ? 'no-cache, no-store, must-revalidate'
              : 'default',
            Pragma: isRefresh ? 'no-cache' : 'default',
            Expires: isRefresh ? '0' : 'default',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch LWOP requests');
        const result = await response.json();
        console.log('[LWOP_FRONTEND] Data received from API:', result);

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

        const processedData = requests.map((req: any) => ({
          ...req,
          createdAt:
            typeof req.createdAt === 'object'
              ? req.createdAt.toISOString()
              : req.createdAt,
          updatedAt:
            typeof req.updatedAt === 'object'
              ? req.updatedAt.toISOString()
              : req.updatedAt,
          // Keep submittedBy as an object, don't overwrite it
        }));

        // Client-side filtering for HRO: only show their own submissions
        const filteredData = processedData.filter((req: LWOPRequest) => {
          if (
            role === ROLES.HHRMD ||
            role === ROLES.HRMO ||
            role === ROLES.CSCS ||
            role === ROLES.HRRP
          ) {
            return true;
          } else if (role === ROLES.HRO) {
            return req.submittedById === user.id;
          }
          return true;
        });

        setPendingRequests(filteredData);
        if (isRefresh) {
          toast({
            title: 'Refreshed',
            description: 'LWOP requests have been updated.',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load LWOP requests.',
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

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setDuration('');
    setReason('');
    setLetterOfRequestKey('');
    setEmployeeConsentLetterKey('');
  };

  const handleEmployeeFound = (employee: Employee) => {
    console.log(`[LWOP] Found employee: ${employee.name}`);

    // Reset form fields when new employee is selected
    resetForm();
    setEmployeeDetails(employee);
  };

  const handleClearEmployee = () => {
    setEmployeeDetails(null);
    resetForm();
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
    if (!request || !user) {
      toast({
        title: 'Error',
        description: 'Request or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    // Validation for corrected fields
    if (!correctedDuration) {
      toast({
        title: 'Submission Error',
        description: 'Duration is missing. Please fill in the duration.',
        variant: 'destructive',
      });
      return;
    }
    if (!correctedReason) {
      toast({
        title: 'Submission Error',
        description: 'Reason for LWOP is missing. Please fill in the reason.',
        variant: 'destructive',
      });
      return;
    }

    const parsedMonths = parseDurationToMonths(correctedDuration);
    if (parsedMonths === null) {
      toast({
        title: 'Invalid Duration Format',
        description:
          "Please enter duration like '6 months', '1 year', or a number of months (e.g., '24').",
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (parsedMonths > 36) {
      toast({
        title: 'LWOP Duration Exceeded',
        description: 'Maximum LWOP duration is 36 months.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (!correctedLetterOfRequestKey || !correctedEmployeeConsentLetterKey) {
      toast({
        title: 'Submission Error',
        description: 'All required PDF documents must be attached.',
        variant: 'destructive',
      });
      return;
    }

    // Optimistic update to immediately hide the "Correct & Resubmit" button and show new status
    const optimisticUpdate = pendingRequests.map((req) =>
      req.id === request.id
        ? {
            ...req,
            status: 'Pending HRRP Review',
            reviewStage: 'initial',
            rejectionReason: null,
            duration: correctedDuration,
            reason: correctedReason,
            documents: [
              correctedLetterOfRequestKey,
              correctedEmployeeConsentLetterKey,
            ],
            updatedAt: new Date().toISOString(),
          }
        : req
    );
    setPendingRequests(optimisticUpdate);

    // Show immediate success feedback
    const employeeData = getEmployeeFromRequest(request);
    toast({
      title: 'Request Corrected & Resubmitted',
      description: `LWOP request for ${employeeData?.name || 'Employee'} has been corrected and resubmitted. Status: Pending HRRP Review`,
      duration: 4000,
    });

    // Close modal immediately for better UX
    setIsCorrectionModalOpen(false);
    setRequestToCorrect(null);

    try {
      const response = await fetchWithCsrf(`/api/lwop`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: request.id,
          userRole: role,
          status: 'Pending HRRP Review', // Resubmitted requests go to HRRP review
          reviewStage: 'initial',
          duration: correctedDuration, // Update duration
          reason: correctedReason, // Update reason
          documents: [
            correctedLetterOfRequestKey,
            correctedEmployeeConsentLetterKey,
          ].filter(Boolean),
          rejectionReason: null, // Clear rejection reason on resubmission
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resubmit LWOP request');
      }

      // Force refresh to get accurate server data
      await fetchRequests();
    } catch (error) {
      // Revert optimistic update on error and show error feedback
      await fetchRequests();
      toast({
        title: 'Update Failed',
        description: 'Could not update the request.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitLwopRequest = async () => {
    if (!employeeDetails || !user) {
      toast({
        title: 'Submission Error',
        description: 'Employee or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    if (cannotSubmitLWOP) {
      let message = '';
      if (isEmployeeOnProbation) {
        message =
          "This employee is currently 'On Probation' and cannot apply for LWOP.";
      } else if (isEmployeeOnLWOP) {
        message = 'Cannot request LWOP for employees already on LWOP.';
      } else if (hasPendingLWOPRequest) {
        message = 'This employee already has a pending LWOP request.';
      }

      toast({
        title: 'LWOP Not Applicable',
        description: message,
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (!startDate) {
      toast({
        title: 'Submission Error',
        description: 'Start date is missing. Please select a start date.',
        variant: 'destructive',
      });
      return;
    }
    if (!endDate) {
      toast({
        title: 'Submission Error',
        description: 'End date is missing. Please select an end date.',
        variant: 'destructive',
      });
      return;
    }
    if (!reason) {
      toast({
        title: 'Submission Error',
        description: 'Reason for LWOP is missing. Please fill in the reason.',
        variant: 'destructive',
      });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      toast({
        title: 'Invalid Date Range',
        description: 'End date must be after start date.',
        variant: 'destructive',
      });
      return;
    }

    // Calculate duration in months
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.ceil(diffDays / 30);

    if (diffMonths > 36) {
      toast({
        title: 'LWOP Duration Exceeded',
        description: `Maximum LWOP duration is 36 months. Selected duration is ${diffMonths} months.`,
        variant: 'destructive',
      });
      return;
    }

    // Create duration string for display
    const durationStr = diffMonths === 1 ? '1 month' : `${diffMonths} months`;

    if (!letterOfRequestKey || !employeeConsentLetterKey) {
      toast({
        title: 'Submission Error',
        description: 'All required PDF documents must be attached.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const documentsList = [letterOfRequestKey, employeeConsentLetterKey];

    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      userRole: role,
      documents: documentsList,
      status: role === ROLES.HRRP
        ? 'Approved by HRRP - Awaiting Commission Review'
        : 'Pending HRRP Review',
      reviewStage: role === ROLES.HRRP ? 'hrrp_review' : 'initial',
      startDate,
      endDate,
      duration: durationStr,
      reason,
    };

    try {
      const response = await fetchWithCsrf('/api/lwop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to submit request');

      await fetchRequests(); // Refresh list immediately
      toast({
        title: 'LWOP Request Submitted',
        description: `Request for ${employeeDetails.name} submitted successfully.`,
      });
      setEmployeeDetails(null);
      resetForm();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Could not submit the LWOP request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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
      const employeeData = getEmployeeFromRequest(request);
      toast({
        title: 'Status Updated',
        description: `${actionDescription} for ${employeeData?.name || 'Employee'}. Status: ${payload.status}`,
        duration: 3000,
      });
    }

    try {
      const response = await fetchWithCsrf(`/api/lwop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          ...payload,
          userRole: role,
        }),
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
      // HRMO/HHRMD approval forwards to Commission
      const roleName = role === ROLES.HRMO ? 'HRMO' : 'HHRMD';
      const payload = {
        status: `Approved by ${roleName} – Awaiting Commission Decision`,
        reviewStage: 'commission_review',
        decisionDate: new Date().toISOString(),
        reviewedById: user?.id,
      };

      await handleUpdateRequest(
        requestId,
        payload,
        `Request approved by ${roleName} and forwarded to Commission`
      );
    }
  };

  const handleHrrpAction = async (
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
      // HRRP approves and forwards to commission
      const payload = {
        status: 'Approved by HRRP - Awaiting Commission Review',
        reviewStage: 'hrrp_review',
        hrrpReviewedById: user?.id,
        hrrpReviewedAt: new Date().toISOString(),
        decisionDate: new Date().toISOString(),
      };

      await handleUpdateRequest(
        requestId,
        payload,
        'Request approved by HRRP and forwarded to Commission'
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
      // HHRMD or HRMO rejection
      rejectionStatus = `Rejected by ${role} - Awaiting HRO Correction`;
    }

    const payload: any = {
      status: rejectionStatus,
      rejectionReason: rejectionReasonInput,
      reviewStage: 'initial',
      decisionDate: new Date().toISOString(),
    };
    // Only set reviewedById for HHRMD/HRMO rejections, not HRRP
    if (role !== ROLES.HRRP) {
      payload.reviewedById = user?.id;
    }
    const success = await handleUpdateRequest(
      currentRequestToAction.id,
      payload,
      'Request rejected and returned to HRO'
    );
    if (success) {
      setIsRejectionModalOpen(false);
      setCurrentRequestToAction(null);
      setRejectionReasonInput('');
    }
  };

  const handleCommissionDecision = async () => {
    if (!commissionDecisionRequestId || !commissionDecisionType || !user) return;

    if (!commissionLetterFile) {
      toast({
        title: 'Barua Inahitajika',
        description: 'Tafadhali pakia barua rasmi ya Tume kabla ya kuwasilisha uamuzi.',
        variant: 'destructive',
      });
      return;
    }

    if (commissionDecisionType === 'rejected' && !commissionRejectionReason.trim()) {
      toast({
        title: 'Sababu ya Kukataa Inahitajika',
        description: 'Tafadhali toa sababu ya kukataa ombi hili.',
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

      const payload: Record<string, any> = {
        status: finalStatus,
        reviewStage: 'completed',
        commissionDecisionDate: new Date().toISOString(),
        reviewedById: user.id,
        commissionLetterKey: commissionLetterFile,
      };

      if (commissionDecisionType === 'rejected') {
        payload.rejectionReason = commissionRejectionReason;
      }

      await handleUpdateRequest(
        commissionDecisionRequestId,
        payload,
        commissionDecisionType === 'approved'
          ? 'LWOP approved by Commission'
          : 'LWOP rejected by Commission'
      );

      setIsCommissionDecisionModalOpen(false);
      setCommissionLetterFile('');
      setCommissionRejectionReason('');
      setCommissionDecisionRequestId(null);
      setCommissionDecisionType(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Imeshindwa kufanya uamuzi. Tafadhali jaribu tena.',
        variant: 'destructive',
      });
    } finally {
      setIsCommissionSubmitting(false);
    }
  };

  const paginatedRequests = pendingRequests || [];

  return (
    <div>
      <PageHeader
        title="Leave Without Pay (LWOP)"
        description="Manage LWOP requests."
      />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit LWOP Request</CardTitle>
            <CardDescription>
              Search employee by ZANID or Payroll Number, then complete the LWOP
              form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EmployeeSearch
              onEmployeeFound={handleEmployeeFound}
              onClear={handleClearEmployee}
              disabled={isSubmitting}
            />

            {employeeDetails && (
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
                                parseISO(
                                  String(employeeDetails.employmentDate)
                                ),
                                'PPP'
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
                                parseISO(String(employeeDetails.dateOfBirth)),
                                'PPP'
                              )
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="lg:col-span-1">
                        <Label className="text-muted-foreground">
                          Institution:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {typeof employeeDetails.institution === 'object' &&
                          employeeDetails.institution !== null
                            ? employeeDetails.institution.name
                            : employeeDetails.institution || 'N/A'}
                        </p>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label className="text-muted-foreground">
                          Current Status:
                        </Label>{' '}
                        <p
                          className={`font-semibold ${isEmployeeOnProbation ? 'text-destructive' : 'text-green-600'}`}
                        >
                          {employeeDetails.status || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {cannotSubmitLWOP && (
                  <div className="flex items-center p-4 mt-2 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>
                      {isEmployeeOnProbation &&
                        "LWOP is not applicable for employees currently 'On Probation'."}
                      {isEmployeeOnLWOP &&
                        'Cannot request LWOP for employees already on LWOP.'}
                      {hasPendingLWOPRequest &&
                        'This employee already has a pending LWOP request.'}
                    </span>
                  </div>
                )}

                <div
                  className={`space-y-4 ${cannotSubmitLWOP ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <h3 className="text-lg font-medium text-foreground">
                    LWOP Details
                  </h3>
                  <div>
                    <Label htmlFor="startDateLwop">Start Date</Label>
                    <Input
                      id="startDateLwop"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isSubmitting || cannotSubmitLWOP}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDateLwop">End Date</Label>
                    <Input
                      id="endDateLwop"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isSubmitting || cannotSubmitLWOP}
                      min={startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  {duration && (
                    <div className="p-3 bg-secondary rounded-md">
                      <Label className="text-sm font-medium">
                        Calculated Duration
                      </Label>
                      <p className="text-lg font-semibold text-primary">
                        {duration}
                      </p>
                      {parseInt(duration.match(/\d+/)?.[0] || '0') > 36 && (
                        <p className="text-sm text-destructive mt-1">
                          ⚠️ Exceeds maximum allowed duration of 36 months
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="reasonLwop">Reason for LWOP</Label>
                    <Textarea
                      id="reasonLwop"
                      placeholder="State the reason for the leave request"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={isSubmitting || cannotSubmitLWOP}
                    />
                  </div>
                  <FileUpload
                    label="Letter of Request"
                    description="Upload the official letter of request (PDF only)"
                    accept=".pdf"
                    value={letterOfRequestKey}
                    onChange={(key) =>
                      setLetterOfRequestKey(Array.isArray(key) ? key[0] : key)
                    }
                    folder="lwop/letters"
                    disabled={isSubmitting || cannotSubmitLWOP}
                    required
                  />
                  <FileUpload
                    label="Employee's Consent Letter"
                    description="Upload the employee's consent letter (PDF only)"
                    accept=".pdf"
                    value={employeeConsentLetterKey}
                    onChange={(key) =>
                      setEmployeeConsentLetterKey(
                        Array.isArray(key) ? key[0] : key
                      )
                    }
                    folder="lwop/consents"
                    disabled={isSubmitting || cannotSubmitLWOP}
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button
                onClick={handleSubmitLwopRequest}
                disabled={
                  !employeeDetails ||
                  !startDate ||
                  !endDate ||
                  !reason ||
                  !letterOfRequestKey ||
                  !employeeConsentLetterKey ||
                  isSubmitting ||
                  cannotSubmitLWOP
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit LWOP Request
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {(role === ROLES.HHRMD ||
        role === ROLES.HRMO ||
        role === ROLES.CSCS ||
        role === ROLES.HRRP ||
        role === ROLES.HRO) && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {role === ROLES.HRO
                    ? 'My LWOP Requests'
                    : role === ROLES.HRRP
                      ? 'Review LWOP Requests'
                      : 'Review LWOP Requests'}
                </CardTitle>
                <CardDescription>
                  {role === ROLES.HRO
                    ? 'View and manage your submitted LWOP requests.'
                    : role === ROLES.HRRP
                      ? 'Review HRO-submitted requests and forward approved ones to the Commission.'
                      : 'Review, approve, or reject pending LWOP requests.'}
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
              paginatedRequests.map((request) => {
                const employeeData = getEmployeeFromRequest(request);
                return (
                  <div
                    key={request.id}
                    className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        LWOP Request for: {employeeData?.name || 'N/A'} (ZanID:{' '}
                        {employeeData?.zanId || 'N/A'})
                        {(request.status.includes('Approved by Commission') ||
                          request.status.includes(
                            'Rejected by Commission'
                          )) && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              request.status.includes('Approved by Commission')
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {request.status.includes(
                              'Approved by Commission'
                            ) ? (
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
                      Duration: {request.duration}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reason: {request.reason}
                    </p>
                    {role !== ROLES.HRO && (
                      <p className="text-sm text-muted-foreground">
                        Institution:{' '}
                        {(employeeData as any)?.Institution?.name ||
                          (typeof (employeeData as any)?.institution === 'string'
                            ? (employeeData as any)?.institution
                            : (employeeData as any)?.institution?.name) ||
                          'N/A'}
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
                    {request.decisionDate && (
                      <p className="text-sm text-muted-foreground">
                        Initial Review Date:{' '}
                        {format(parseISO(request.decisionDate), 'PPP')}
                      </p>
                    )}
                    {request.commissionDecisionDate && (
                      <p className="text-sm text-muted-foreground">
                        Commission Decision Date:{' '}
                        {format(parseISO(request.commissionDecisionDate), 'PPP')}
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
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : request.status === 'Pending HRRP Review'
                                    ? 'bg-purple-100 text-purple-800'
                                    : request.status.includes('Pending HRMO/HHRMD')
                                      ? 'bg-orange-100 text-orange-800'
                                      : request.status.includes('Awaiting HRO') || request.status.includes('Correction')
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : request.status.includes('Rejected')
                                          ? 'bg-red-100 text-red-800'
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
                              request.status.includes('Awaiting Commission') ||
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
                              request.status.includes('Approved by HRMO')
                                ? 'bg-green-500'
                                : request.status.includes('Approved by HHRMD')
                                  ? 'bg-green-500'
                                  : request.status === 'Approved by HRRP - Awaiting Commission Review' ||
                                    request.status === 'Pending HRMO/HHRMD Review'
                                    ? 'bg-orange-500'
                                    : request.status.includes('Awaiting Commission Decision')
                                      ? 'bg-blue-500'
                                      : 'bg-gray-300'
                            }`}
                          ></div>
                          <span className="text-[10px]">
                            {request.status.includes('Approved by HRMO')
                              ? 'HRMO ✓'
                              : request.status.includes('Approved by HHRMD')
                                ? 'HHRMD ✓'
                                : 'HRMO/HHRMD Review'}
                          </span>
                          <div className="w-3 h-px bg-gray-300"></div>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              ['Approved by Commission', 'Rejected by Commission - Request Concluded'].includes(request.status)
                                ? 'bg-green-500'
                                : request.status.includes('Awaiting Commission Decision')
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300'
                            }`}
                          ></div>
                          <span className="text-[10px]">Commission Decision</span>
                        </div>
                      </div>
                    </div>
                    {/* Workflow Progress Indicator */}
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground font-medium mr-2">Workflow:</span>
                      <WorkflowSteps steps={getLwopWorkflowSteps(request.status)} />
                    </div>
                    {request.rejectionReason && (
                      <p className="text-sm text-destructive">
                        <span className="font-medium">Rejection Reason:</span>{' '}
                        {request.rejectionReason}
                      </p>
                    )}
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
                      {/* HRRP Review Actions */}
                      {role === ROLES.HRRP && request.status === 'Pending HRRP Review' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleHrrpAction(request.id, 'forward')}
                          >
                            Verify &amp; Forward to Commission
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
                      {/* HRMO/HHRMD Commission Review Actions */}
                      {(role === ROLES.HHRMD || role === ROLES.HRMO) && (
                        <>
                          {/* Commission initial review - for HRRP-approved and legacy requests */}
                          {(role === ROLES.HRMO || role === ROLES.HHRMD) &&
                            (request.status === 'Approved by HRRP - Awaiting Commission Review' ||
                             request.status === 'Pending HRMO/HHRMD Review') && (
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
                          {/* Commission decision */}
                          {(role === ROLES.HHRMD || role === ROLES.HRMO) &&
                            request.reviewStage === 'commission_review' &&
                            request.status.includes('Awaiting Commission Decision') && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  setCommissionDecisionRequestId(request.id);
                                  setCommissionDecisionType('approved');
                                  setCommissionLetterFile('');
                                  setCommissionRejectionReason('');
                                  setIsCommissionDecisionModalOpen(true);
                                }}
                              >
                                Approved by Commission
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setCommissionDecisionRequestId(request.id);
                                  setCommissionDecisionType('rejected');
                                  setCommissionLetterFile('');
                                  setCommissionRejectionReason('');
                                  setIsCommissionDecisionModalOpen(true);
                                }}
                              >
                                Rejected by Commission
                              </Button>
                            </>
                          )}
                        </>
                      )}

                      {role === ROLES.HRO &&
                        (request.status ===
                          'Rejected by HHRMD - Awaiting HRO Correction' ||
                          request.status ===
                            'Rejected by HRMO - Awaiting HRO Correction' ||
                          request.status ===
                            'Rejected by HRRP - Awaiting HRO Correction') && (
                          <Button
                            size="sm"
                            onClick={() => handleResubmit(request)}
                          >
                            Correct and Resubmit
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">
                No LWOP requests pending your review.
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

      {selectedRequest &&
        (() => {
          const selectedEmployeeData = getEmployeeFromRequest(selectedRequest);
          return (
            <Dialog
              open={isDetailsModalOpen}
              onOpenChange={setIsDetailsModalOpen}
            >
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    Request Details: {selectedRequest.id}
                  </DialogTitle>
                  <DialogDescription>
                    LWOP request for{' '}
                    <strong>{selectedEmployeeData?.name || 'N/A'}</strong>{' '}
                    (ZanID: {selectedEmployeeData?.zanId || 'N/A'}).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
                  <div className="space-y-1 border-b pb-3 mb-3">
                    <h4 className="font-semibold text-base text-foreground mb-2">
                      Employee Information
                    </h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Full Name:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        ZanID:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.zanId || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Payroll #:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.payrollNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        ZSSF #:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.zssfNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Department:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.department || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Cadre/Position:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.cadre || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Employment Date:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.employmentDate
                          ? format(
                              parseISO(
                                selectedEmployeeData.employmentDate.toString()
                              ),
                              'PPP'
                            )
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Date of Birth:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.dateOfBirth
                          ? format(
                              parseISO(
                                selectedEmployeeData.dateOfBirth.toString()
                              ),
                              'PPP'
                            )
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Institution:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.Institution?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-base text-foreground mb-2">
                      Request Information
                    </h4>
                    {selectedRequest.startDate && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          Start Date:
                        </Label>
                        <p className="col-span-2">
                          {format(parseISO(selectedRequest.startDate), 'PPP')}
                        </p>
                      </div>
                    )}
                    {selectedRequest.endDate && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          End Date:
                        </Label>
                        <p className="col-span-2">
                          {format(parseISO(selectedRequest.endDate), 'PPP')}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold">
                        Duration:
                      </Label>
                      <p className="col-span-2">{selectedRequest.duration}</p>
                    </div>
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold pt-1">
                        Reason:
                      </Label>
                      <p className="col-span-2">{selectedRequest.reason}</p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold">
                        Submitted:
                      </Label>
                      <p className="col-span-2">
                        {selectedRequest.createdAt
                          ? format(parseISO(selectedRequest.createdAt), 'PPP')
                          : 'N/A'}{' '}
                        by {selectedRequest.submittedBy?.name || 'N/A'}
                      </p>
                    </div>
                    {selectedRequest.hrrpReviewedBy && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          HRRP Reviewed By:
                        </Label>
                        <p className="col-span-2">
                          {selectedRequest.hrrpReviewedBy.name || 'N/A'} (
                          {selectedRequest.hrrpReviewedBy.username || 'N/A'})
                        </p>
                      </div>
                    )}
                    {selectedRequest.decisionDate && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          Initial Review:
                        </Label>
                        <p className="col-span-2">
                          {format(parseISO(selectedRequest.decisionDate), 'PPP')}
                        </p>
                      </div>
                    )}
                    {selectedRequest.commissionDecisionDate && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          Commission Date:
                        </Label>
                        <p className="col-span-2">
                          {format(
                            typeof selectedRequest.commissionDecisionDate === 'string'
                              ? parseISO(selectedRequest.commissionDecisionDate)
                              : selectedRequest.commissionDecisionDate,
                            'PPP'
                          )}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold">
                        Status:
                      </Label>
                      <p className="col-span-2 text-primary">
                        {selectedRequest.status}
                      </p>
                    </div>
                    {selectedRequest.rejectionReason && (
                      <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold text-destructive pt-1">
                          Rejection Reason:
                        </Label>
                        <p className="col-span-2 text-destructive">
                          {selectedRequest.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 mt-3 border-t">
                    <Label className="font-semibold">Attached Documents</Label>
                    <div className="mt-2 space-y-2">
                      {selectedRequest.documents &&
                      selectedRequest.documents.length > 0 ? (
                        selectedRequest.documents.map((doc, index) => {
                          const shortName = getShortDocumentName(doc);
                          const isLetterOfRequest = index === 0;
                          const documentType = isLetterOfRequest
                            ? 'Letter of Request'
                            : 'Employee Consent Letter';

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-md border bg-secondary/50"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p
                                    className="font-medium text-sm text-foreground truncate"
                                    title={doc}
                                  >
                                    {documentType}
                                  </p>
                                  <p
                                    className="text-xs text-muted-foreground truncate"
                                    title={doc}
                                  >
                                    {shortName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => {
                                    setPreviewFileKey(doc);
                                    setIsPreviewModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(
                                        `/api/files/download/${doc}`,
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
                                      console.error('Download error:', error);
                                      toast({
                                        title: 'Download Failed',
                                        description:
                                          'An error occurred while downloading the file.',
                                        variant: 'destructive',
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
                        <p className="text-muted-foreground text-sm">
                          No documents were attached to this request.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Commission Letter */}
                  {selectedRequest.commissionLetterKey && (
                    <div className="pt-3 mt-3 border-t">
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
          );
        })()}

      {currentRequestToAction &&
        (() => {
          const currentEmployeeData = getEmployeeFromRequest(
            currentRequestToAction
          );
          return (
            <Dialog
              open={isRejectionModalOpen}
              onOpenChange={setIsRejectionModalOpen}
            >
              <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Reject LWOP Request: {currentRequestToAction.id}
                  </DialogTitle>
                  <DialogDescription>
                    Please provide the reason for rejecting the LWOP request for{' '}
                    <strong>{currentEmployeeData?.name || 'N/A'}</strong>. This
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
          );
        })()}

      {/* Commission Decision Modal */}
      <Dialog
        open={isCommissionDecisionModalOpen}
        onOpenChange={setIsCommissionDecisionModalOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {commissionDecisionType === 'approved'
                ? 'Approved by Commission'
                : 'Rejected by Commission'}
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
                folder="lwop/commission-letters"
                value={commissionLetterFile}
                onChange={(value) => setCommissionLetterFile(value as string)}
                onPreview={(objectKey) => {
                  setPreviewFileKey(objectKey);
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
              className={
                commissionDecisionType === 'approved'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : ''
              }
              variant={commissionDecisionType === 'rejected' ? 'destructive' : 'default'}
              onClick={handleCommissionDecision}
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

      {/* Correction Modal */}
      <Dialog
        open={isCorrectionModalOpen}
        onOpenChange={setIsCorrectionModalOpen}
      >
        <DialogContent className="sm:max-w-2xl">
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
                onChange={(key) =>
                  setCorrectedLetterOfRequestKey(
                    Array.isArray(key) ? key[0] : key
                  )
                }
                folder="lwop/letters"
                required
              />
              <FileUpload
                label="Employee's Consent Letter (PDF)"
                description="Upload the corrected consent letter"
                accept=".pdf"
                value={correctedEmployeeConsentLetterKey}
                onChange={(key) =>
                  setCorrectedEmployeeConsentLetterKey(
                    Array.isArray(key) ? key[0] : key
                  )
                }
                folder="lwop/consents"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCorrectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => handleConfirmResubmit(requestToCorrect)}>
              Confirm Resubmission
            </Button>
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

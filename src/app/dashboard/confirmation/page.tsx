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
import { useAuth } from '@/hooks/use-auth';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import { isHroLike, isHrrpLike } from '@/lib/role-utils';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import React, { useState, useEffect } from 'react';
import { WorkflowSteps } from '@/components/shared/workflow-steps';
import type { WorkflowStep } from '@/components/shared/workflow-steps';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  FileText,
  CheckCircle,
  Award,
  AlertTriangle,
  RefreshCw,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, isAfter } from 'date-fns';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { EmployeeSearch } from '@/components/shared/employee-search';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'confirmation' });

interface ConfirmationRequest {
  id: string;
  Employee?: Partial<Employee & User & { Institution: { name: string } }>; // API returns this (capital E)
  employee?: Partial<Employee & User & { institution: { name: string } }>; // Keep for compatibility
  submittedBy: Partial<User>;
  submittedById?: string;
  reviewedBy?: Partial<User> | null;
  hrrpReviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  documents: string[];
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  decisionDate?: string | null;
  commissionDecisionDate?: string | null;
  commissionLetterKey?: string | null;
  hrrpReviewedAt?: string | null;
}

function getConfirmationWorkflowSteps(status: string): WorkflowStep[] {
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

export default function ConfirmationPage() {
  const { role, user, isLoading: isAuthLoading } = useAuth();
  const [employeeToConfirm, setEmployeeToConfirm] = useState<Employee | null>(
    null
  );

  const [evaluationFormFile, setEvaluationFormFile] = useState<string>('');
  const [ipaCertificateFile, setIpaCertificateFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIpaRequired, setIsIpaRequired] = useState(false);
  const [hasPendingConfirmation, setHasPendingConfirmation] = useState(false);

  const [pendingRequests, setPendingRequests] = useState<ConfirmationRequest[]>(
    []
  );
  const [selectedRequest, setSelectedRequest] =
    useState<ConfirmationRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] =
    useState<ConfirmationRequest | null>(null);

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] =
    useState<ConfirmationRequest | null>(null);
  const [correctedEvaluationFormFile, setCorrectedEvaluationFormFile] =
    useState<string>('');
  const [correctedIpaCertificateFile, setCorrectedIpaCertificateFile] =
    useState<string>('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] =
    useState<string>('');

  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [commissionDecisionType, setCommissionDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [commissionDecisionRequestId, setCommissionDecisionRequestId] = useState<string | null>(null);
  const [commissionLetterFile, setCommissionLetterFile] = useState<string>('');
  const [commissionRejectionReason, setCommissionRejectionReason] = useState('');
  const [isCommissionSubmitting, setIsCommissionSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Helper function to get employee from request (handles both Employee and employee)
  const getEmployeeFromRequest = (request: ConfirmationRequest) => {
    return request.Employee || request.employee;
  };

  const fetchRequests = React.useCallback(
    async (isRefresh = false, page = 1) => {
      if (!user || !role) return;
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        log.info('Fetching confirmation requests');
        // The backend consistently requires userId and userRole. Send both always.
        // Client-side filtering will then handle role-specific display logic.
        // Add cache-busting parameter and headers for refresh
        const cacheBuster = isRefresh ? `&_t=${Date.now()}` : '';
        const params = new URLSearchParams();
        params.append('userId', user.id);
        params.append('userRole', role);
        params.append('userInstitutionId', user.institutionId || '');
        params.append('page', page.toString());
        params.append('size', itemsPerPage.toString());
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const url = `/api/confirmations?${params.toString()}${cacheBuster}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': isRefresh
              ? 'no-cache, no-store, must-revalidate'
              : 'default',
            Pragma: isRefresh ? 'no-cache' : 'default',
            Expires: isRefresh ? '0' : 'default',
          },
        });
        log.info({ status: response.status }, 'Response received');

        if (!response.ok) {
          const errorText = await response.text();
          log.error(
            { status: response.status, errorText },
            'Failed to fetch confirmation requests'
          );
          throw new Error(
            `Failed to fetch confirmation requests: ${response.status} - ${errorText}`
          );
        }

        const result = await response.json();

        // Handle both paginated and non-paginated responses
        const allRequests = Array.isArray(result) ? result : result.data || [];

        log.info({ dataCount: allRequests.length }, 'Fetched data (before client-side filter)');

        // Log the user and role to confirm they are correctly identified
        log.info({ userId: user?.id, role }, 'Current user and role');

        allRequests.forEach((req: ConfirmationRequest) => {
          log.info(
            { requestId: req.id, status: req.status, reviewStage: req.reviewStage },
            'Request details'
          );
        });

        const filteredData = allRequests.filter((req: ConfirmationRequest) => {
          if (
            role === ROLES.HHRMD ||
            role === ROLES.HRMO ||
            role === ROLES.CSCS ||
            isHrrpLike(role)
          ) {
            // Show all requests for HHRMD/HRMO/CSCS/HRRP including completed ones for tracking
            // HRRP sees only their institution (filtered by backend)
            return true;
          } else if (isHroLike(role)) {
            return req.submittedById === user.id;
          }
          return true;
        });

        log.info({ count: filteredData.length }, 'Filtered data');
        // Additional debug for HHRMD
        if (role === ROLES.HHRMD) {
          log.info('HHRMD Debug - Showing requests with following reviewStages');
          filteredData.forEach((req: ConfirmationRequest) => {
            log.info(
              { id: req.id, status: req.status, reviewStage: req.reviewStage },
              'Request review stage'
            );
          });
        }

        setPendingRequests(filteredData);

        // Update pagination info from server response or calculate from filtered data
        if (result.pagination) {
          setTotalItems(result.pagination.total || filteredData.length);
          setTotalPages(
            result.pagination.totalPages ||
              Math.ceil(filteredData.length / itemsPerPage)
          );
        } else {
          // Fallback if pagination info not provided
          setTotalItems(filteredData.length);
          setTotalPages(Math.ceil(filteredData.length / itemsPerPage));
        }

        if (isRefresh) {
          toast({
            title: 'Refreshed',
            description: 'Confirmation requests have been updated.',
            duration: 2000,
          });
        }
      } catch (error: any) {
        log.error({ err: error }, 'Error in fetchRequests');
        toast({
          title: 'Error',
          description: `Could not load confirmation requests: ${error.message || error}`,
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
    [user, role, itemsPerPage, statusFilter]
  );

  useEffect(() => {
    if (!isAuthLoading && user && role) {
      fetchRequests(false, currentPage);
    }
  }, [user, role, isAuthLoading, fetchRequests, statusFilter, currentPage]);

  // Check for pending confirmation whenever employee or requests change
  useEffect(() => {
    log.info({
      hasEmployee: !!employeeToConfirm,
      employeeId: employeeToConfirm?.id,
      requestsCount: pendingRequests.length,
    }, 'useEffect triggered');

    if (employeeToConfirm && pendingRequests.length > 0) {
      const pendingStatuses = [
        'Pending HRRP Review',
        'Pending HRMO/HHRMD Review',
        'Approved by HRRP - Awaiting Commission Review',
        'Pending DO/HHRMD Review',
        'Request Received – Awaiting Commission Decision',
      ];

      // Log all employee IDs from pending requests to debug
      // Note: API returns 'Employee' (capital E) not 'employee'
      log.info(
        { requests: pendingRequests.map((req) => ({
          requestId: req.id,
          employeeId: (req as any).Employee?.id || req.employee?.id,
          employeeName: (req as any).Employee?.name || req.employee?.name,
          status: req.status,
        })) },
        'All employee IDs in pending requests'
      );

      // Find matching requests for this employee
      // API returns 'Employee' (capital E), check both for compatibility
      const matchingRequests = pendingRequests.filter((req) => {
        const employeeId = (req as any).Employee?.id || req.employee?.id;
        return employeeId === employeeToConfirm.id;
      });

      log.info({
        employeeId: employeeToConfirm.id,
        matchingCount: matchingRequests.length,
        matchingRequests: matchingRequests.map((r) => ({
          id: r.id,
          employeeId: (r as any).Employee?.id || r.employee?.id,
          employeeName: (r as any).Employee?.name || r.employee?.name,
          status: r.status,
          reviewStage: r.reviewStage,
        })),
      }, 'Matching requests for employee');

      const hasPending = matchingRequests.some((req) =>
        pendingStatuses.includes(req.status)
      );

      log.info({
        hasPending,
        pendingStatuses,
      }, 'Has pending result');

      setHasPendingConfirmation(hasPending);
    } else if (!employeeToConfirm) {
      log.info('No employee selected, clearing pending state');
      setHasPendingConfirmation(false);
    } else if (pendingRequests.length === 0) {
      log.info('No requests loaded yet, waiting');
    }
  }, [employeeToConfirm, pendingRequests]);

  const isAlreadyConfirmed = employeeToConfirm?.status === 'Confirmed';

  const resetEmployeeAndForm = () => {
    setEmployeeToConfirm(null);
    setEvaluationFormFile('');
    setIpaCertificateFile('');
    setLetterOfRequestFile('');
    setIsIpaRequired(false);
    setHasPendingConfirmation(false);
  };

  const handleEmployeeFound = (employee: Employee) => {
    log.info({ employeeId: employee.id, employeeName: employee.name }, 'Found employee');

    // Reset form fields when new employee is selected
    resetEmployeeAndForm();

    setEmployeeToConfirm(employee);

    // Check if IPA certificate is required based on employment date
    if (employee.employmentDate) {
      try {
        const employmentDate =
          typeof employee.employmentDate === 'string'
            ? parseISO(employee.employmentDate)
            : employee.employmentDate;
        const cutoffDate = new Date('2014-05-01');
        if (isAfter(employmentDate, cutoffDate)) {
          setIsIpaRequired(true);
        }
      } catch (error) {
        toast({
          title: 'Date Error',
          description: "Could not parse employee's employment date.",
          variant: 'destructive',
        });
      }
    }

    // Note: Pending confirmation check is handled in useEffect to ensure pendingRequests is loaded
  };

  const handleClearEmployee = () => {
    resetEmployeeAndForm();
  };

  const handleSubmitRequest = async () => {
    if (!employeeToConfirm || !user) {
      toast({
        title: 'Submission Error',
        description: 'Employee or user details are missing.',
        variant: 'destructive',
      });
      return;
    }
    // Validation checks...
    if (
      evaluationFormFile === '' ||
      letterOfRequestFile === '' ||
      (isIpaRequired && ipaCertificateFile === '')
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please check all required documents are attached.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const documentsList = [evaluationFormFile, letterOfRequestFile];
    if (isIpaRequired && ipaCertificateFile)
      documentsList.push(ipaCertificateFile);

    const payload = {
      employeeId: employeeToConfirm.id,
      submittedById: user.id,
      userRole: role,
      documents: documentsList,
      // HRO submissions go to HRRP review first; HRRP submissions auto-approve
      status: isHrrpLike(role)
        ? 'Approved by HRRP - Awaiting Commission Review'
        : 'Pending HRRP Review',
      reviewStage: isHrrpLike(role) ? 'hrrp_review' : 'initial',
    };

    try {
      const response = await fetchWithCsrf('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to submit request');

      await fetchRequests(); // Refresh list immediately
      toast({
        title: 'Confirmation Request Submitted',
        description: `Confirmation request for ${employeeToConfirm.name} submitted successfully.`,
      });
      resetEmployeeAndForm();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Could not submit the confirmation request.',
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
      const response = await fetchWithCsrf(`/api/confirmations`, {
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

  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim() || !user)
      return;

    let rejectionStatus: string;
    if (isHrrpLike(role)) {
      rejectionStatus = 'Rejected by HRRP - Awaiting HRO Correction';
    } else {
      // HHRMD or HRMO commission rejection
      rejectionStatus = `Rejected by ${role} - Awaiting HRO Correction`;
    }

    const payload: any = {
      status: rejectionStatus,
      rejectionReason: rejectionReasonInput,
      reviewStage: 'initial',
      decisionDate: new Date().toISOString(),
    };
    // Only set reviewedById for commission rejections, not HRRP
    if (!isHrrpLike(role)) {
      payload.reviewedById = user?.id;
    }
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
          ? 'Confirmation approved by Commission'
          : 'Confirmation rejected by Commission'
      );

      setIsCommissionDecisionModalOpen(false);
      setCommissionLetterFile('');
      setCommissionRejectionReason('');
      setCommissionDecisionRequestId(null);
      setCommissionDecisionType(null);
    } catch (error) {
      log.error({ err: error }, 'Commission decision error');
      toast({
        title: 'Error',
        description: 'Imeshindwa kufanya uamuzi. Tafadhali jaribu tena.',
        variant: 'destructive',
      });
    } finally {
      setIsCommissionSubmitting(false);
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

    if (
      correctedEvaluationFormFile === '' ||
      correctedLetterOfRequestFile === '' ||
      (((requestToCorrect?.Employee?.employmentDate &&
        isAfter(
          typeof requestToCorrect.Employee.employmentDate === 'string'
            ? parseISO(requestToCorrect.Employee.employmentDate)
            : requestToCorrect.Employee.employmentDate,
          new Date('2014-05-01')
        )) ||
        requestToCorrect?.documents.includes('IPA Certificate')) &&
        correctedIpaCertificateFile === '')
    ) {
      toast({
        title: 'Submission Error',
        description: 'All required documents must be attached.',
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
            updatedAt: new Date().toISOString(),
          }
        : req
    );
    setPendingRequests(optimisticUpdate);

    // Show immediate success feedback
    const employeeData = getEmployeeFromRequest(request);
    toast({
      title: 'Request Corrected & Resubmitted',
      description: `Confirmation request for ${employeeData?.name || 'Employee'} has been corrected and resubmitted. Status: Pending HRRP Review`,
      duration: 4000,
    });

    // Close modal immediately for better UX
    setIsCorrectionModalOpen(false);
    setRequestToCorrect(null);

    try {
      const response = await fetchWithCsrf(`/api/confirmations`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: request.id,
          userRole: role,
          status: 'Pending HRRP Review', // Resubmitted requests go to HRRP review
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

      // Force refresh to get accurate server data
      await fetchRequests();
    } catch (error) {
      // Revert optimistic update on error and show error feedback
      await fetchRequests();
      log.error({ err: error }, 'Resubmit confirmation error');
      toast({
        title: 'Error',
        description: 'Failed to resubmit confirmation request.',
        variant: 'destructive',
      });
    }
  };

  const isSubmitDisabled =
    !employeeToConfirm ||
    evaluationFormFile === '' ||
    (isIpaRequired && ipaCertificateFile === '') ||
    letterOfRequestFile === '' ||
    isSubmitting ||
    isAlreadyConfirmed ||
    hasPendingConfirmation;

  // Debug logging for button state
  log.info({
    hasEmployee: !!employeeToConfirm,
    evaluationFormFile: !!evaluationFormFile,
    ipaCertificateFile: !!ipaCertificateFile,
    letterOfRequestFile: !!letterOfRequestFile,
    isIpaRequired,
    isSubmitting,
    isAlreadyConfirmed,
    isDisabled: isSubmitDisabled,
  }, 'Submit button state');

  // Server-side pagination - use requests directly from API
  const paginatedRequests = pendingRequests || [];

  return (
    <div>
      <PageHeader
        title="Employee Confirmation"
        description="Manage employee confirmation processes."
      />
      {isHroLike(role) && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Confirmation Request</CardTitle>
            <CardDescription>
              Enter employee's ZanID to fetch details. Required documents will
              be determined by hiring date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <EmployeeSearch
              onEmployeeFound={handleEmployeeFound}
              onClear={handleClearEmployee}
              disabled={isSubmitting}
            />

            {employeeToConfirm && (
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
                          {employeeToConfirm.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">ZanID:</Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeToConfirm.zanId}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Payroll Number:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeToConfirm.payrollNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          ZSSF Number:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeToConfirm.zssfNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Department:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeToConfirm.department || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Cadre/Position:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeToConfirm.cadre || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Employment Date:
                        </Label>{' '}
                        <p className="font-semibold text-foreground">
                          {employeeToConfirm.employmentDate
                            ? format(
                                parseISO(
                                  employeeToConfirm.employmentDate.toString()
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
                          {employeeToConfirm.dateOfBirth
                            ? format(
                                parseISO(
                                  employeeToConfirm.dateOfBirth.toString()
                                ),
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
                          {typeof employeeToConfirm.institution === 'object'
                            ? employeeToConfirm.institution?.name
                            : employeeToConfirm.institution || 'N/A'}
                        </p>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label className="text-muted-foreground">
                          Current Status:
                        </Label>{' '}
                        <p
                          className={`font-semibold ${employeeToConfirm.status === 'Confirmed' ? 'text-green-600' : employeeToConfirm.status === 'On Probation' ? 'text-orange-500' : 'text-foreground'}`}
                        >
                          {employeeToConfirm.status || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isAlreadyConfirmed && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Already Confirmed</AlertTitle>
                    <AlertDescription>
                      This employee is already confirmed.
                    </AlertDescription>
                  </Alert>
                )}

                {hasPendingConfirmation && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request Already Submitted</AlertTitle>
                    <AlertDescription>
                      A confirmation request for this employee is already being
                      reviewed. You cannot submit another request until the
                      current one is completed.
                    </AlertDescription>
                  </Alert>
                )}

                {!isAlreadyConfirmed && !hasPendingConfirmation && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">
                      Required Documents (PDF Only)
                    </h3>
                    {isIpaRequired && (
                      <p className="text-sm text-muted-foreground -mt-3 mb-2">
                        IPA Certificate is required for this employee (hired
                        from May 2014 onwards).
                      </p>
                    )}
                    <div>
                      <Label className="flex items-center mb-2">
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Evaluation Form
                      </Label>
                      <FileUpload
                        value={evaluationFormFile}
                        onChange={(key) =>
                          setEvaluationFormFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="confirmation/evaluation-forms"
                        accept=".pdf"
                        maxSize={1}
                        disabled={
                          isSubmitting ||
                          isAlreadyConfirmed ||
                          hasPendingConfirmation
                        }
                      />
                    </div>
                    {isIpaRequired && (
                      <div>
                        <Label className="flex items-center mb-2">
                          <Award className="mr-2 h-4 w-4 text-primary" />
                          Upload IPA Certificate
                        </Label>
                        <FileUpload
                          value={ipaCertificateFile}
                          onChange={(key) =>
                            setIpaCertificateFile(
                              Array.isArray(key) ? key[0] : key
                            )
                          }
                          folder="confirmation/ipa-certificates"
                          accept=".pdf"
                          maxSize={1}
                          disabled={
                            isSubmitting ||
                            isAlreadyConfirmed ||
                            hasPendingConfirmation
                          }
                        />
                      </div>
                    )}
                    <div>
                      <Label className="flex items-center mb-2">
                        <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                        Upload Letter of Request
                      </Label>
                      <FileUpload
                        value={letterOfRequestFile}
                        onChange={(key) =>
                          setLetterOfRequestFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="confirmation/letters"
                        accept=".pdf"
                        maxSize={1}
                        disabled={
                          isSubmitting ||
                          isAlreadyConfirmed ||
                          hasPendingConfirmation
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {employeeToConfirm &&
            !isAlreadyConfirmed &&
            !hasPendingConfirmation && (
              <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
                <Button
                  onClick={handleSubmitRequest}
                  disabled={isSubmitDisabled}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Request
                </Button>
              </CardFooter>
            )}
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isHroLike(role)
                  ? 'My Confirmation Requests'
                  : isHrrpLike(role)
                    ? 'Review Confirmation Requests'
                    : 'Review Confirmation Requests'}
              </CardTitle>
              <CardDescription>
                {isHroLike(role)
                  ? 'View and manage your submitted confirmation requests.'
                  : isHrrpLike(role)
                    ? 'Review HRO-submitted requests and forward approved ones to the Commission.'
                    : 'Review, approve, or reject pending employee confirmation requests.'}
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
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    Confirmation for: {employeeData?.name || 'N/A'} (ZanID:{' '}
                    {employeeData?.zanId || 'N/A'})
                    {request.reviewStage === 'completed' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Department: {employeeData?.department || 'N/A'}
                  </p>
                  {!isHroLike(role) && (
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
                    Submitted: {format(parseISO(request.createdAt), 'PPP')} by{' '}
                    {request.submittedBy?.name || 'N/A'}
                  </p>
                  {request.updatedAt && (
                    <p className="text-sm text-muted-foreground">
                      Last Updated: {format(parseISO(request.updatedAt), 'PPP')}
                    </p>
                  )}
                  {request.reviewedBy && (
                    <p className="text-sm text-muted-foreground">
                      Reviewed by: {request.reviewedBy.name || 'N/A'} (
                      {request.reviewedBy.username || 'N/A'})
                    </p>
                  )}
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
                                    : request.status.includes('Awaiting HRO') ||
                                      request.status.includes('Correction')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  {/* Workflow Progress Indicator */}
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground font-medium mr-2">Workflow:</span>
                    <WorkflowSteps steps={getConfirmationWorkflowSteps(request.status)} />
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
                    {isHrrpLike(role) && request.status === 'Pending HRRP Review' && (
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
                    {/* HRO Correction Actions */}
                    {isHroLike(role) &&
                      (request.status === 'Rejected by HRMO - Awaiting HRO Correction' ||
                       request.status === 'Rejected by HHRMD - Awaiting HRO Correction' ||
                       request.status === 'Rejected by HRRP - Awaiting HRO Correction') && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
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
              No confirmation requests pending your review.
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
                    Confirmation for{' '}
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
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        ZanID:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.zanId || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Payroll #:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.payrollNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        ZSSF #:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.zssfNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Department:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.department || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Cadre:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.cadre || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Employment Date:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.employmentDate
                          ? format(
                              typeof selectedEmployeeData.employmentDate ===
                                'string'
                                ? parseISO(selectedEmployeeData.employmentDate)
                                : selectedEmployeeData.employmentDate,
                              'PPP'
                            )
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        DOB:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {selectedEmployeeData?.dateOfBirth
                          ? format(
                              typeof selectedEmployeeData.dateOfBirth ===
                                'string'
                                ? parseISO(selectedEmployeeData.dateOfBirth)
                                : selectedEmployeeData.dateOfBirth,
                              'PPP'
                            )
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Institution:
                      </Label>
                      <p className="col-span-2 font-medium">
                        {(selectedEmployeeData as any)?.Institution?.name ||
                          (typeof (selectedEmployeeData as any)?.institution ===
                          'string'
                            ? (selectedEmployeeData as any)?.institution
                            : (selectedEmployeeData as any)?.institution?.name) ||
                          'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-base text-foreground mb-2">
                      Request Information
                    </h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold">
                        Submitted:
                      </Label>
                      <p className="col-span-2">
                        {format(parseISO(selectedRequest.createdAt), 'PPP')} by{' '}
                        {selectedRequest.submittedBy?.name || 'N/A'}
                      </p>
                    </div>
                    {selectedRequest.updatedAt && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          Last Updated:
                        </Label>
                        <p className="col-span-2">
                          {format(parseISO(selectedRequest.updatedAt), 'PPP')}
                        </p>
                      </div>
                    )}
                    {selectedRequest.reviewedBy && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          Reviewed By:
                        </Label>
                        <p className="col-span-2">
                          {selectedRequest.reviewedBy.name || 'N/A'} (
                          {selectedRequest.reviewedBy.username || 'N/A'})
                        </p>
                      </div>
                    )}
                    {selectedRequest.decisionDate && (
                      <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                        <Label className="text-right font-semibold">
                          Initial Review:
                        </Label>
                        <p className="col-span-2">
                          {format(
                            parseISO(selectedRequest.decisionDate),
                            'PPP'
                          )}
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
                            typeof selectedRequest.commissionDecisionDate ===
                              'string'
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
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span
                                  className="font-medium text-foreground"
                                  title={doc}
                                >
                                  {shortName}
                                </span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handlePreviewFile(doc)}
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
                                      log.error({ err: error }, 'Download failed');
                                      toast({
                                        title: 'Download Failed',
                                        description:
                                          'Could not download the file. Please try again.',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                >
                                  Download
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No documents attached.
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
                                  log.error({ err: error }, 'Download failed');
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
                folder="confirmation/commission-letters"
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
                    Reject Confirmation: {currentRequestToAction.id}
                  </DialogTitle>
                  <DialogDescription>
                    Provide the reason for rejecting the confirmation for{' '}
                    <strong>{currentEmployeeData?.name || 'N/A'}</strong>.
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
                    onClick={() => setIsRejectionModalOpen(false)}
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

      {requestToCorrect &&
        (() => {
          const correctEmployeeData = getEmployeeFromRequest(requestToCorrect);
          return (
            <Dialog
              open={isCorrectionModalOpen}
              onOpenChange={setIsCorrectionModalOpen}
            >
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    Correct & Resubmit Confirmation Request
                  </DialogTitle>
                  <DialogDescription>
                    Please upload the corrected documents for{' '}
                    <strong>{correctEmployeeData?.name || 'N/A'}</strong>{' '}
                    (ZanID: {correctEmployeeData?.zanId || 'N/A'}).
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Alert variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      All required PDF documents must be re-attached, even if
                      only one needed correction.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label className="flex items-center mb-2">
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Upload Corrected Evaluation Form
                    </Label>
                    <FileUpload
                      value={correctedEvaluationFormFile}
                      onChange={(key) =>
                        setCorrectedEvaluationFormFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      folder="confirmation/evaluation-forms"
                      accept=".pdf"
                      maxSize={1}
                    />
                  </div>
                  {((requestToCorrect?.Employee?.employmentDate &&
                    isAfter(
                      typeof requestToCorrect.Employee.employmentDate ===
                        'string'
                        ? parseISO(requestToCorrect.Employee.employmentDate)
                        : requestToCorrect.Employee.employmentDate,
                      new Date('2014-05-01')
                    )) ||
                    requestToCorrect?.documents.includes(
                      'IPA Certificate'
                    )) && (
                    <div>
                      <Label className="flex items-center mb-2">
                        <Award className="mr-2 h-4 w-4 text-primary" />
                        Upload Corrected IPA Certificate
                      </Label>
                      <FileUpload
                        value={correctedIpaCertificateFile}
                        onChange={(key) =>
                          setCorrectedIpaCertificateFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="confirmation/ipa-certificates"
                        accept=".pdf"
                        maxSize={1}
                      />
                    </div>
                  )}
                  <div>
                    <Label className="flex items-center mb-2">
                      <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                      Upload Corrected Letter of Request
                    </Label>
                    <FileUpload
                      value={correctedLetterOfRequestFile}
                      onChange={(key) =>
                        setCorrectedLetterOfRequestFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      folder="confirmation/letters"
                      accept=".pdf"
                      maxSize={1}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCorrectionModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleConfirmResubmit(requestToCorrect)}
                  >
                    Resubmit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}

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

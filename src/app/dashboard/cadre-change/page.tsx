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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
import { isHroLike, isHrrpLike } from '@/lib/role-utils';
import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowSteps } from '@/components/shared/workflow-steps';
import type { WorkflowStep } from '@/components/shared/workflow-steps';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  FileText,
  Award,
  ChevronsUpDown,
  AlertTriangle,
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
import { format, parseISO, differenceInYears } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { apiClient } from '@/lib/api-client';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { EmployeeSearch } from '@/components/shared/employee-search';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';

interface CadreChangeRequest {
  id: string;
  Employee?: Partial<Employee & User & { Institution: { name: string } }>;
  employee?: Partial<Employee & User & { institution: { name: string } }>;
  submittedBy: Partial<User>;
  submittedById?: string;
  reviewedBy?: Partial<User> | null;
  hrrpReviewedBy?: Partial<User> | null;
  status: string;
  reviewStage: string;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  decisionDate?: string | null;
  commissionDecisionDate?: string | null;
  commissionLetterKey?: string | null;
  hrrpReviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string;

  originalCadre?: string | null;
  newCadre: string;
  reason?: string | null;
  documents: string[];
  studiedOutsideCountry?: boolean | null;
}

function getCadreChangeWorkflowSteps(status: string): WorkflowStep[] {
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

export default function CadreChangePage() {
  const { role, user } = useAuth();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newCadre, setNewCadre] = useState('');
  const [reasonCadreChange, setReasonCadreChange] = useState('');
  const [certificateFile, setCertificateFile] = useState<string>('');
  const [studiedOutsideCountry, setStudiedOutsideCountry] = useState(false);
  const [tcuFormFile, setTcuFormFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<CadreChangeRequest[]>(
    []
  );
  const [selectedRequest, setSelectedRequest] =
    useState<CadreChangeRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] =
    useState<CadreChangeRequest | null>(null);

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] =
    useState<CadreChangeRequest | null>(null);
  const [correctedCertificateFile, setCorrectedCertificateFile] =
    useState<string>('');
  const [correctedTcuFormFile, setCorrectedTcuFormFile] = useState<string>('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] =
    useState<string>('');
  const [correctedNewCadre, setCorrectedNewCadre] = useState('');
  const [correctedReasonCadreChange, setCorrectedReasonCadreChange] =
    useState('');
  const [correctedStudiedOutsideCountry, setCorrectedStudiedOutsideCountry] =
    useState(false);

  // Commission decision modal states
  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [commissionDecisionType, setCommissionDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [commissionDecisionRequestId, setCommissionDecisionRequestId] = useState<string | null>(null);
  const [commissionLetterFile, setCommissionLetterFile] = useState<string>('');
  const [commissionRejectionReason, setCommissionRejectionReason] = useState('');
  const [isCommissionSubmitting, setIsCommissionSubmitting] = useState(false);

  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [hasPendingCadreChange, setHasPendingCadreChange] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requestSearchQuery, setRequestSearchQuery] = useState('');

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
  const getEmployeeFromRequest = (request: CadreChangeRequest) => {
    return request.Employee || request.employee;
  };

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

        const response = await fetch(`/api/cadre-change?${params.toString()}`, {
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
          throw new Error('Failed to fetch cadre change requests');
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
            description: 'Cadre change requests have been updated.',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load cadre change requests.',
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
    setNewCadre('');
    setReasonCadreChange('');
    setCertificateFile('');
    setStudiedOutsideCountry(false);
    setTcuFormFile('');
    setLetterOfRequestFile('');
    setHasPendingCadreChange(false);
    const checkboxInput = document.getElementById(
      'studiedOutsideCountryCadre'
    ) as HTMLInputElement;
    if (checkboxInput) checkboxInput.checked = false;
  };

  const handleEmployeeFound = (employee: Employee) => {
    resetFormFields();
    setEligibilityError(null);

    let error = null;

    // Validate employee status using the validation utility
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'cadre-change'
    );

    if (!statusValidation.isValid) {
      error = statusValidation.message;
    } else if (employee.employmentDate) {
      // Check years of service requirement (only if status is valid)
      const employmentDate =
        typeof employee.employmentDate === 'string'
          ? parseISO(employee.employmentDate)
          : employee.employmentDate;
      const yearsOfService = differenceInYears(new Date(), employmentDate);
      if (yearsOfService < 3) {
        error = `Employee must have at least 3 years of service for a cadre change. Current service: ${yearsOfService} years.`;
      }
    }

    // Check for pending cadre change request
    const pendingStatuses = [
      'Pending HRRP Review',
      'Approved by HRRP - Awaiting Commission Review',
      'Pending HRMO/HHRMD Review',
      'Pending DO/HHRMD Review',
      'Approved by HRMO - Awaiting Commission Decision',
      'Approved by HHRMD - Awaiting Commission Decision',
      'Request Received – Awaiting Commission Decision',
    ];

    console.log('[CADRE_CHANGE] Checking for pending requests:', {
      employeeId: employee.id,
      totalRequests: pendingRequests.length,
    });

    // API returns 'Employee' (capital E), check both for compatibility
    const hasPending = pendingRequests.some((req) => {
      const employeeId = (req as any).Employee?.id || req.employee?.id;
      return employeeId === employee.id && pendingStatuses.includes(req.status);
    });

    console.log('[CADRE_CHANGE] Has pending result:', hasPending);

    setHasPendingCadreChange(hasPending);
    setEmployeeDetails(employee);

    if (error) {
      setEligibilityError(error);
      toast({
        title: 'Employee Ineligible',
        description: error,
        variant: 'destructive',
        duration: 7000,
      });
    } else {
      setEligibilityError(null);
    }
  };

  const handleEmployeeClear = () => {
    setEmployeeDetails(null);
    resetFormFields();
    setEligibilityError(null);
    setHasPendingCadreChange(false);
  };

  const handleSubmitRequest = async () => {
    if (!!eligibilityError) {
      toast({
        title: 'Submission Error',
        description: 'This employee is ineligible for a cadre change.',
        variant: 'destructive',
      });
      return;
    }
    if (!employeeDetails || !user) {
      toast({
        title: 'Submission Error',
        description: 'Employee or user details are missing.',
        variant: 'destructive',
      });
      return;
    }
    // Validation logic...
    if (!letterOfRequestFile || (studiedOutsideCountry && !tcuFormFile)) {
      toast({
        title: 'Submission Error',
        description: 'Please upload all required documents.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const documents = [letterOfRequestFile]; // Store actual file keys
    if (certificateFile) documents.push(certificateFile);
    if (studiedOutsideCountry && tcuFormFile) documents.push(tcuFormFile);

    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRRP Review',
      reviewStage: 'initial',
      newCadre,
      reason: reasonCadreChange,
      documents: documents,
      studiedOutsideCountry: studiedOutsideCountry,
    };

    try {
      const response = await fetchWithCsrf('/api/cadre-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to submit request');

      await fetchRequests(); // Refresh list immediately
      toast({
        title: 'Cadre Change Request Submitted',
        description: `Request for ${employeeDetails.name} submitted successfully.`,
      });
      setEmployeeDetails(null);
      resetFormFields();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Could not submit the cadre change request.',
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

    try {
      const response = await fetchWithCsrf(`/api/cadre-change`, {
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

  const handleInitialAction = async (
    requestId: string,
    action: 'forward' | 'reject'
  ) => {
    const request = Array.isArray(pendingRequests)
      ? pendingRequests.find((req) => req.id === requestId)
      : null;
    if (!request) return;

    if (action === 'reject') {
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    } else if (action === 'forward') {
      // Both HRMO and HHRMD forward directly to Commission (parallel workflow)
      const payload = {
        status: 'Request Received – Awaiting Commission Decision',
        reviewStage: 'commission_review',
        decisionDate: new Date().toISOString(),
      };
      const roleName = role === ROLES.HRMO ? 'HRMO' : 'HHRMD';

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

    // Determine the correct rejection status based on who is rejecting
    let rejectionStatus: string;
    if (isHrrpLike(role)) {
      rejectionStatus = 'Rejected by HRRP - Awaiting HRO Correction';
    } else {
      rejectionStatus = `Rejected by ${role} - Awaiting HRO Correction`;
    }

    const payload = {
      status: rejectionStatus,
      rejectionReason: rejectionReasonInput,
      reviewStage: 'initial',
    };
    const actionDescription = 'Request rejected and returned to HRO';

    const success = await handleUpdateRequest(
      currentRequestToAction.id,
      payload,
      actionDescription
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

      const request = pendingRequests.find((req) => req.id === commissionDecisionRequestId);
      const actionDescription = commissionDecisionType === 'approved'
        ? `Cadre change approved by Commission. Employee ${request?.Employee?.name || 'Employee'} cadre updated to "${request?.newCadre}".`
        : 'Cadre change request rejected by Commission';

      await handleUpdateRequest(
        commissionDecisionRequestId,
        payload,
        actionDescription
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

  const handleHrrpAction = async (
    requestId: string,
    action: 'forward' | 'reject'
  ) => {
    if (!user) return;

    if (action === 'forward') {
      await handleUpdateRequest(
        requestId,
        {
          status: 'Approved by HRRP - Awaiting Commission Review',
          reviewStage: 'hrrp_review',
          hrrpReviewedById: user.id,
          hrrpReviewedAt: new Date().toISOString(),
        },
        'Request approved by HRRP and forwarded to Commission'
      );
    } else if (action === 'reject') {
      setCurrentRequestToAction(pendingRequests.find((req) => req.id === requestId) || null);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
    }
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

    if (
      !correctedNewCadre ||
      !correctedReasonCadreChange ||
      !correctedLetterOfRequestFile ||
      (correctedStudiedOutsideCountry && !correctedTcuFormFile)
    ) {
      toast({
        title: 'Submission Error',
        description: 'All required fields and PDF documents must be provided.',
        variant: 'destructive',
      });
      return;
    }

    const documents = [correctedLetterOfRequestFile]; // Store actual file keys
    if (correctedCertificateFile) documents.push(correctedCertificateFile);
    if (correctedStudiedOutsideCountry && correctedTcuFormFile)
      documents.push(correctedTcuFormFile);

    const payload = {
      status: 'Pending HRRP Review',
      reviewStage: 'initial',
      newCadre: correctedNewCadre,
      reason: correctedReasonCadreChange,
      studiedOutsideCountry: correctedStudiedOutsideCountry,
      documents: documents,
      rejectionReason: null,
    };

    // Use the optimistic update pattern
    const success = await handleUpdateRequest(
      request.id,
      payload,
      `Cadre change request corrected and resubmitted`
    );

    if (success) {
      setIsCorrectionModalOpen(false);
      setRequestToCorrect(null);
    }
  };

  const searchQuery = requestSearchQuery.trim().toLowerCase();
  const baseRequests = pendingRequests || [];
  const filteredBySearch = searchQuery
    ? baseRequests.filter((request) => {
        const emp = getEmployeeFromRequest?.(request) ?? request.Employee ?? request.employee;
        const zanId = emp?.zanId ?? '';
        const payroll = emp?.payrollNumber ?? '';
        return (
          zanId.toLowerCase().includes(searchQuery) ||
          payroll.toLowerCase().includes(searchQuery)
        );
      })
    : baseRequests;
  const paginatedRequests = filteredBySearch;

  return (
    <div>
      <PageHeader
        title="Change of Cadre"
        description="Process employee cadre changes."
      />
      {isHroLike(role) && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Cadre Change Request</CardTitle>
            <CardDescription>
              Search for an employee by ZANID or Payroll Number, then complete
              the form. All documents must be PDF.
            </CardDescription>
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
                          Current Cadre/Position:
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
                                typeof employeeDetails.dateOfBirth === 'string'
                                  ? parseISO(employeeDetails.dateOfBirth)
                                  : employeeDetails.dateOfBirth,
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
                          {typeof employeeDetails.institution === 'object'
                            ? employeeDetails.institution?.name
                            : employeeDetails.institution || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {eligibilityError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Ineligibility Notice</AlertTitle>
                    <AlertDescription>{eligibilityError}</AlertDescription>
                  </Alert>
                )}

                {hasPendingCadreChange && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request Already Submitted</AlertTitle>
                    <AlertDescription>
                      A cadre change request for this employee is already being
                      reviewed. You cannot submit another request until the
                      current one is completed.
                    </AlertDescription>
                  </Alert>
                )}

                {!eligibilityError && !hasPendingCadreChange && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">
                      Cadre Change Details &amp; Documents (PDF Only)
                    </h3>
                    <div>
                      <Label htmlFor="newCadre">
                        Write new cadre and grade
                      </Label>
                      <Input
                        id="newCadre"
                        placeholder="e.g., Senior Human Resource Officer"
                        value={newCadre}
                        onChange={(e) => setNewCadre(e.target.value)}
                        disabled={
                          isSubmitting ||
                          !!eligibilityError ||
                          hasPendingCadreChange
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="reasonCadreChange">
                        Reason for Cadre Change &amp; Qualifications
                      </Label>
                      <Textarea
                        id="reasonCadreChange"
                        placeholder="Explain the reason and list relevant qualifications"
                        value={reasonCadreChange}
                        onChange={(e) => setReasonCadreChange(e.target.value)}
                        disabled={
                          isSubmitting ||
                          !!eligibilityError ||
                          hasPendingCadreChange
                        }
                      />
                    </div>
                    <FileUpload
                      label="Upload Certificate"
                      description="Upload your qualification certificate (Optional)"
                      accept=".pdf"
                      value={certificateFile}
                      onChange={(value) =>
                        setCertificateFile(
                          Array.isArray(value) ? value[0] : value
                        )
                      }
                      folder="cadre-change"
                      disabled={
                        isSubmitting ||
                        !!eligibilityError ||
                        hasPendingCadreChange
                      }
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="studiedOutsideCountryCadre"
                        checked={studiedOutsideCountry}
                        onCheckedChange={(checked) =>
                          setStudiedOutsideCountry(checked as boolean)
                        }
                        disabled={
                          isSubmitting ||
                          !!eligibilityError ||
                          hasPendingCadreChange
                        }
                      />
                      <Label
                        htmlFor="studiedOutsideCountryCadre"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Employee studied outside the country? (Requires TCU
                        Form)
                      </Label>
                    </div>
                    {studiedOutsideCountry && (
                      <FileUpload
                        label="Upload TCU Form"
                        description="TCU verification form is required for foreign studies"
                        accept=".pdf"
                        value={tcuFormFile}
                        onChange={(value) =>
                          setTcuFormFile(
                            Array.isArray(value) ? value[0] : value
                          )
                        }
                        folder="cadre-change"
                        disabled={
                          isSubmitting ||
                          !!eligibilityError ||
                          hasPendingCadreChange
                        }
                        required
                      />
                    )}
                    <FileUpload
                      label="Upload Letter of Request"
                      description="Official letter requesting cadre change (Required)"
                      accept=".pdf"
                      value={letterOfRequestFile}
                      onChange={(value) =>
                        setLetterOfRequestFile(
                          Array.isArray(value) ? value[0] : value
                        )
                      }
                      folder="cadre-change"
                      disabled={
                        isSubmitting ||
                        !!eligibilityError ||
                        hasPendingCadreChange
                      }
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {employeeDetails && !eligibilityError && !hasPendingCadreChange && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button
                onClick={handleSubmitRequest}
                disabled={
                  !!eligibilityError ||
                  hasPendingCadreChange ||
                  !employeeDetails ||
                  !newCadre ||
                  !reasonCadreChange ||
                  !letterOfRequestFile ||
                  (studiedOutsideCountry && !tcuFormFile) ||
                  isSubmitting
                }
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

      {isHroLike(role) &&
        Array.isArray(pendingRequests) &&
        pendingRequests.length > 0 && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Submitted Cadre Change Requests</CardTitle>
                  <CardDescription>
                    Track the status of cadre change requests you have
                    submitted.
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
                <div className="relative w-full sm:w-72 mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ZAN ID or Payroll Number..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
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
              {paginatedRequests.map((request) => {
                const employeeData = getEmployeeFromRequest(request);
                return (
                  <div
                    key={request.id}
                    className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        Cadre Change for: {employeeData?.name || 'N/A'} (ZanID:{' '}
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
                      From Cadre:{' '}
                      {request.originalCadre ||
                        (request.status.includes('Approved by Commission') ||
                        request.status.includes('Rejected by Commission')
                          ? '(Original cadre not recorded)'
                          : employeeData?.cadre || 'N/A')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To Cadre: {request.newCadre}
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
                      Submitted:{' '}
                      {request.createdAt
                        ? format(parseISO(request.createdAt), 'PPP')
                        : 'N/A'}{' '}
                      by {request.submittedBy?.name || 'N/A'}
                    </p>
                    {request.updatedAt && (
                      <p className="text-sm text-muted-foreground">
                        Last Updated: {format(parseISO(request.updatedAt), 'PPP')}
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
                                : request.status.includes('Pending HRMO/HHRMD')
                                  ? 'bg-orange-100 text-orange-800'
                                  : request.status.includes('Awaiting HRO')
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : request.status.includes('Correction')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {request.status}
                      </span>
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
                      <WorkflowSteps steps={getCadreChangeWorkflowSteps(request.status)} />
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
                      {isHroLike(role) &&
                        (request.status ===
                          'Rejected by HRMO - Awaiting HRO Correction' ||
                          request.status ===
                            'Rejected by HHRMD - Awaiting HRO Correction' ||
                          request.status ===
                            'Rejected by HRRP - Awaiting HRO Correction') && (
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
              })}
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

      {(role === ROLES.HHRMD || role === ROLES.HRMO || role === ROLES.CSCS || isHrrpLike(role)) && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Cadre Change Requests</CardTitle>
                <CardDescription>
                  Review, approve, or reject pending cadre change requests.
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
              <div className="relative w-full sm:w-72 mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ZAN ID or Payroll Number..."
                  value={requestSearchQuery}
                  onChange={(e) => setRequestSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
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
                        Cadre Change for: {employeeData?.name || 'N/A'} (ZanID:{' '}
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
                      From Cadre:{' '}
                      {request.originalCadre ||
                        (request.status.includes('Approved by Commission') ||
                        request.status.includes('Rejected by Commission')
                          ? '(Original cadre not recorded)'
                          : employeeData?.cadre || 'N/A')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To Cadre: {request.newCadre}
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
                      Submitted:{' '}
                      {request.createdAt
                        ? format(parseISO(request.createdAt), 'PPP')
                        : 'N/A'}{' '}
                      by {request.submittedBy?.name || 'N/A'}
                    </p>
                    {request.updatedAt && (
                      <p className="text-sm text-muted-foreground">
                        Last Updated: {format(parseISO(request.updatedAt), 'PPP')}
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
                                : request.status.includes('Pending HRMO/HHRMD')
                                  ? 'bg-orange-100 text-orange-800'
                                  : request.status.includes('Awaiting HRO')
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : request.status.includes('Correction')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {request.status}
                      </span>
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
                      <WorkflowSteps steps={getCadreChangeWorkflowSteps(request.status)} />
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
                      {(role === ROLES.HHRMD ||
                        role === ROLES.HRMO ||
                        role === ROLES.CSCS) && (
                        <>
                          {/* HRMO/HHRMD Parallel Review Actions */}
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
                                  Verify & Forward to Commission
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleInitialAction(request.id, 'reject')
                                  }
                                >
                                  Reject & Return to HRO
                                </Button>
                              </>
                            )}
                        </>
                      )}
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
                      {/* Commission Decision Actions */}
                      {(role === ROLES.HRMO || role === ROLES.HHRMD) &&
                        request.reviewStage === 'commission_review' &&
                        request.status.includes('Awaiting Commission Decision') && (
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
                );
              })
            ) : (
              <p className="text-muted-foreground">
                No cadre change requests pending your review.
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
                    Change of Cadre request for{' '}
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
                        {selectedEmployeeData?.zanId}
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
                        {selectedEmployeeData?.department}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                      <Label className="text-right text-muted-foreground">
                        Current Cadre:
                      </Label>
                      <p className="col-span-2 font-medium text-foreground">
                        {selectedEmployeeData?.cadre}
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
                                typeof selectedEmployeeData.employmentDate ===
                                  'string'
                                  ? selectedEmployeeData.employmentDate
                                  : selectedEmployeeData.employmentDate.toISOString()
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
                                typeof selectedEmployeeData.dateOfBirth ===
                                  'string'
                                  ? selectedEmployeeData.dateOfBirth
                                  : selectedEmployeeData.dateOfBirth.toISOString()
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
                        {selectedEmployeeData?.Institution
                          ? typeof selectedEmployeeData.Institution === 'string'
                            ? selectedEmployeeData.Institution
                            : selectedEmployeeData.Institution.name
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-base text-foreground mb-2">
                      Request Information
                    </h4>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold">
                        New Cadre:
                      </Label>
                      <p className="col-span-2">{selectedRequest.newCadre}</p>
                    </div>
                    <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold pt-1">
                        Reason:
                      </Label>
                      <p className="col-span-2">
                        {selectedRequest.reason || 'Not specified'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                      <Label className="text-right font-semibold">
                        Studied Outside?:
                      </Label>
                      <p className="col-span-2">
                        {selectedRequest.studiedOutsideCountry ? 'Yes' : 'No'}
                      </p>
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
                          HRRP Reviewed by:
                        </Label>
                        <p className="col-span-2">
                          {selectedRequest.hrrpReviewedBy.name || 'N/A'} (
                          {selectedRequest.hrrpReviewedBy.username || 'N/A'})
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
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handlePreviewFile(objectKey)}
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
                    Reject Cadre Change Request: {currentRequestToAction.id}
                  </DialogTitle>
                  <DialogDescription>
                    Please provide the reason for rejecting the cadre change
                    request for{' '}
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
                folder="cadre-change/commission-letters"
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

      {requestToCorrect &&
        (() => {
          const correctEmployeeData = getEmployeeFromRequest(requestToCorrect);
          return (
            <Dialog
              open={isCorrectionModalOpen}
              onOpenChange={setIsCorrectionModalOpen}
            >
              <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Correct & Resubmit Cadre Change Request
                  </DialogTitle>
                  <DialogDescription>
                    Please update the details and upload corrected documents for{' '}
                    <strong>{correctEmployeeData?.name || 'N/A'}</strong>{' '}
                    (ZanID: {correctEmployeeData?.zanId || 'N/A'}).
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Alert variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Update the cadre details and re-attach all required PDF
                      documents, even if only one needed correction.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="correctedNewCadre">
                        Write new cadre and grade
                      </Label>
                      <Input
                        id="correctedNewCadre"
                        placeholder="e.g., Senior Human Resource Officer"
                        value={correctedNewCadre}
                        onChange={(e) => setCorrectedNewCadre(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="correctedReasonCadreChange">
                        Reason for Cadre Change & Qualifications
                      </Label>
                      <Textarea
                        id="correctedReasonCadreChange"
                        placeholder="Explain the reason and list relevant qualifications"
                        value={correctedReasonCadreChange}
                        onChange={(e) =>
                          setCorrectedReasonCadreChange(e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="correctedStudiedOutsideCountry"
                        checked={correctedStudiedOutsideCountry}
                        onCheckedChange={(checked) =>
                          setCorrectedStudiedOutsideCountry(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="correctedStudiedOutsideCountry"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Employee studied outside the country? (Requires TCU
                        Form)
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-base">
                      Required Documents (PDF Only)
                    </h4>
                    <FileUpload
                      label="Upload Certificate"
                      description="Upload your qualification certificate (Optional)"
                      accept=".pdf"
                      value={correctedCertificateFile}
                      onChange={(value) =>
                        setCorrectedCertificateFile(
                          Array.isArray(value) ? value[0] : value
                        )
                      }
                      folder="cadre-change"
                    />
                    {correctedStudiedOutsideCountry && (
                      <FileUpload
                        label="Upload TCU Form"
                        description="TCU verification form is required for foreign studies"
                        accept=".pdf"
                        value={correctedTcuFormFile}
                        onChange={(value) =>
                          setCorrectedTcuFormFile(
                            Array.isArray(value) ? value[0] : value
                          )
                        }
                        folder="cadre-change"
                        required
                      />
                    )}
                    <FileUpload
                      label="Upload Letter of Request"
                      description="Official letter requesting cadre change (Required)"
                      accept=".pdf"
                      value={correctedLetterOfRequestFile}
                      onChange={(value) =>
                        setCorrectedLetterOfRequestFile(
                          Array.isArray(value) ? value[0] : value
                        )
                      }
                      folder="cadre-change"
                      required
                    />
                  </div>

                  {requestToCorrect.rejectionReason && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <Label className="font-semibold text-destructive">
                        Previous Rejection Reason:
                      </Label>
                      <p className="text-sm text-destructive mt-1">
                        {requestToCorrect.rejectionReason}
                      </p>
                    </div>
                  )}
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

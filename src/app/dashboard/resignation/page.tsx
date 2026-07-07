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
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  FileText,
  CalendarDays,
  Paperclip,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { apiClient } from '@/lib/api-client';
import { EmployeeSearch } from '@/components/shared/employee-search';

interface ResignationRequest {
  id: string;
  Employee: Partial<Employee & User & { Institution: { name: string } }>;
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

  effectiveDate: string;
  reason?: string | null;
  documents: string[];
}

export default function ResignationPage() {
  const { role, user } = useAuth();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPendingResignation, setHasPendingResignation] = useState(false);

  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [noticeOrReceiptFile, setNoticeOrReceiptFile] = useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');
  const [minEffectiveDate, setMinEffectiveDate] = useState('');

  const [pendingRequests, setPendingRequests] = useState<ResignationRequest[]>(
    []
  );
  const [selectedRequest, setSelectedRequest] =
    useState<ResignationRequest | null>(null);
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
    useState<ResignationRequest | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] =
    useState<ResignationRequest | null>(null);
  const [correctedEffectiveDate, setCorrectedEffectiveDate] = useState('');
  const [correctedReason, setCorrectedReason] = useState('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] =
    useState<string>('');
  const [correctedNoticeOrReceiptFile, setCorrectedNoticeOrReceiptFile] =
    useState<string>('');

  // Commission decision modal states
  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [commissionDecisionType, setCommissionDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [commissionDecisionRequestId, setCommissionDecisionRequestId] = useState<string | null>(null);
  const [commissionLetterFile, setCommissionLetterFile] = useState<string>('');
  const [commissionRejectionReason, setCommissionRejectionReason] = useState('');
  const [isCommissionSubmitting, setIsCommissionSubmitting] = useState(false);

  // Employee status validation
  const isEmployeeResigned = employeeDetails?.status === 'Resigned';
  const cannotSubmitResignation = isEmployeeResigned;

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

        const response = await fetch(`/api/resignation?${params.toString()}`, {
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
          throw new Error('Failed to fetch resignation requests');
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
            description: 'Resignation requests have been updated.',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load resignation requests.',
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
    setMinEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
  }, [fetchRequests, currentPage, statusFilter]);

  const resetFormFields = () => {
    setEffectiveDate('');
    setReason('');
    setNoticeOrReceiptFile('');
    setLetterOfRequestFile('');
    setHasPendingResignation(false);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => ((input as HTMLInputElement).value = ''));
  };

  const handleEmployeeFound = (employee: Employee) => {
    resetFormFields();

    // Check for pending resignation request
    const pendingStatuses = [
      'Pending HRRP Review',
      'Approved by HRRP - Awaiting Commission Review',
      'Pending HRMO/HHRMD Review',
      'Pending DO/HHRMD Review',
      'Approved by HRMO - Awaiting Commission Decision',
      'Approved by HHRMD - Awaiting Commission Decision',
      'Request Received – Awaiting Commission Decision',
    ];

    const hasPending = pendingRequests.some(
      (req) =>
        req.Employee.id === employee.id && pendingStatuses.includes(req.status)
    );

    if (hasPending) {
      setHasPendingResignation(true);
      toast({
        title: 'Request Already Submitted',
        description:
          'A resignation request for this employee is already being reviewed. You cannot submit another request until the current one is completed.',
        variant: 'destructive',
        duration: 6000,
      });
    }

    setEmployeeDetails(employee);
  };

  const handleEmployeeClear = () => {
    setEmployeeDetails(null);
    resetFormFields();
  };

  const handleSubmitResignationRequest = async () => {
    if (!employeeDetails || !user) {
      toast({
        title: 'Submission Error',
        description: 'Employee or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    if (cannotSubmitResignation) {
      toast({
        title: 'Resignation Not Applicable',
        description:
          'Cannot request resignation for employees who have already resigned.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    // Validation
    if (
      !effectiveDate ||
      letterOfRequestFile === '' ||
      noticeOrReceiptFile === ''
    ) {
      toast({
        title: 'Submission Error',
        description:
          'Please fill all required fields and upload required documents.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const documentObjectKeys: string[] = [];
    if (letterOfRequestFile) documentObjectKeys.push(letterOfRequestFile);
    if (noticeOrReceiptFile) documentObjectKeys.push(noticeOrReceiptFile);

    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRRP Review',
      reviewStage: 'initial',
      effectiveDate: new Date(effectiveDate).toISOString(),
      reason: reason,
      documents: documentObjectKeys,
    };

    try {
      const response = await fetchWithCsrf('/api/resignation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Check if the API request was successful
      if (!response.ok || !result.success) {
        const errorMessage =
          result.message || 'Failed to submit resignation request';
        throw new Error(errorMessage);
      }

      await fetchRequests();
      toast({
        title: 'Resignation Request Submitted',
        description: `Request for ${employeeDetails.name} submitted successfully.`,
      });
      setEmployeeDetails(null);
      resetFormFields();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Could not submit the resignation request.';
      toast({
        title: 'Submission Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Resignation submission error:', error);
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
      toast({
        title: 'Status Updated',
        description: `${actionDescription} for ${request.Employee.name}. Status: ${payload.status}`,
        duration: 3000,
      });
    }

    try {
      const response = await fetchWithCsrf(`/api/resignation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          userRole: role,
          userId: user?.id,
          ...payload,
          ...(payload.hrrpReviewedById ? {} : { reviewedById: user?.id }),
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

  const handleFlagIssue = (request: ResignationRequest) => {
    setCurrentRequestToAction(request);
    setRejectionReasonInput('');
    setIsRejectionModalOpen(true);
  };

  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim()) return;
    let rejectionStatus: string;
    if (role === ROLES.HRRP) {
      rejectionStatus = 'Rejected by HRRP - Awaiting HRO Action';
    } else {
      rejectionStatus = `Rejected by ${role} - Awaiting HRO Action`;
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

      const actionDescription = commissionDecisionType === 'approved'
        ? 'Resignation approved by Commission'
        : 'Resignation rejected by Commission';

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

  const handleCorrection = (request: ResignationRequest) => {
    setRequestToCorrect(request);
    setCorrectedEffectiveDate(
      request.effectiveDate
        ? format(parseISO(request.effectiveDate), 'yyyy-MM-dd')
        : ''
    );
    setCorrectedReason(request.reason || '');
    setCorrectedLetterOfRequestFile('');
    setCorrectedNoticeOrReceiptFile('');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => ((input as HTMLInputElement).value = ''));

    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: ResignationRequest | null) => {
    if (!request || !user) {
      toast({
        title: 'Error',
        description: 'Request or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !correctedEffectiveDate ||
      correctedLetterOfRequestFile === '' ||
      correctedNoticeOrReceiptFile === ''
    ) {
      toast({
        title: 'Validation Error',
        description:
          'Please fill all required fields and upload required documents.',
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
            effectiveDate: new Date(correctedEffectiveDate).toISOString(),
            reason: correctedReason,
            updatedAt: new Date().toISOString(),
          }
        : req
    );
    setPendingRequests(optimisticUpdate);

    // Show immediate success feedback
    toast({
      title: 'Request Corrected & Resubmitted',
      description: `Resignation request for ${request.Employee.name} has been corrected and resubmitted.`,
      duration: 4000,
    });

    // Close modal immediately for better UX
    setIsCorrectionModalOpen(false);
    setRequestToCorrect(null);

    const documentsList: string[] = [];
    if (correctedLetterOfRequestFile)
      documentsList.push(correctedLetterOfRequestFile);
    if (correctedNoticeOrReceiptFile)
      documentsList.push(correctedNoticeOrReceiptFile);

    try {
      const response = await fetchWithCsrf(`/api/resignation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRRP Review',
          reviewStage: 'initial',
          effectiveDate: new Date(correctedEffectiveDate).toISOString(),
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
      console.error('[RESUBMIT_RESIGNATION]', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update the request.',
        variant: 'destructive',
      });
    }
  };

  // Show all requests to HHRMD and HRMO (like other modules)
  const getFilteredRequests = () => {
    return pendingRequests; // Show all requests regardless of role or status
  };

  const filteredRequests = getFilteredRequests();
  const paginatedRequests = filteredRequests || [];

  return (
    <div>
      <PageHeader
        title="Resignation"
        description="Process employee resignations."
      />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Resignation Request</CardTitle>
            <CardDescription>
              Search for an employee by ZANID or Payroll Number, then fill
              resignation details and upload required PDF documents.
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
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label className="text-muted-foreground">
                          Current Status:
                        </Label>{' '}
                        <p
                          className={`font-semibold ${cannotSubmitResignation ? 'text-destructive' : 'text-green-600'}`}
                        >
                          {employeeDetails.status || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {cannotSubmitResignation && (
                  <div className="flex items-center p-4 mt-2 text-sm text-destructive border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>
                      Cannot request resignation for employees who have already
                      resigned.
                    </span>
                  </div>
                )}

                {hasPendingResignation && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request Already Submitted</AlertTitle>
                    <AlertDescription>
                      A resignation request for this employee is already being
                      reviewed. You cannot submit another request until the
                      current one is completed.
                    </AlertDescription>
                  </Alert>
                )}

                <div
                  className={`space-y-4 ${cannotSubmitResignation || hasPendingResignation ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <h3 className="text-lg font-medium text-foreground">
                    Resignation Details & Documents
                  </h3>
                  <div>
                    <Label
                      htmlFor="effectiveDate"
                      className="flex items-center"
                    >
                      <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                      Effective Date of Resignation
                    </Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      disabled={
                        isSubmitting ||
                        cannotSubmitResignation ||
                        hasPendingResignation
                      }
                      min={minEffectiveDate}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reasonResignation">
                      Reason for Resignation
                    </Label>
                    <Textarea
                      id="reasonResignation"
                      placeholder="Optional: Enter reason stated by employee"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={
                        isSubmitting ||
                        cannotSubmitResignation ||
                        hasPendingResignation
                      }
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="letterOfRequestResignation"
                      className="flex items-center"
                    >
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Upload Letter of Request (Required, PDF Only)
                    </Label>
                    <FileUpload
                      folder="resignation"
                      value={letterOfRequestFile}
                      onChange={(key) =>
                        setLetterOfRequestFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      onPreview={handlePreviewFile}
                      disabled={
                        isSubmitting ||
                        cannotSubmitResignation ||
                        hasPendingResignation
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="noticeOrReceiptFile"
                      className="flex items-center"
                    >
                      <Paperclip className="mr-2 h-4 w-4 text-primary" />
                      Upload 3 months resignation notice or receipt of
                      resignation equal to employee's salary (Required, PDF
                      Only)
                    </Label>
                    <FileUpload
                      folder="resignation"
                      value={noticeOrReceiptFile}
                      onChange={(key) =>
                        setNoticeOrReceiptFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      onPreview={handlePreviewFile}
                      disabled={
                        isSubmitting ||
                        cannotSubmitResignation ||
                        hasPendingResignation
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {employeeDetails && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button
                onClick={handleSubmitResignationRequest}
                disabled={
                  !employeeDetails ||
                  !effectiveDate ||
                  !letterOfRequestFile ||
                  !noticeOrReceiptFile ||
                  cannotSubmitResignation ||
                  hasPendingResignation ||
                  isSubmitting
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Resignation Request
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
                <CardTitle>Your Submitted Resignation Requests</CardTitle>
                <CardDescription>
                  Track the status of resignation requests you have submitted.
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
                      Resignation for: {request.Employee.name} (ZanID:{' '}
                      {request.Employee.zanId})
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
                    Effective Date:{' '}
                    {request.effectiveDate
                      ? format(parseISO(request.effectiveDate), 'PPP')
                      : 'N/A'}
                  </p>
                  {role !== ROLES.HRO && (
                    <p className="text-sm text-muted-foreground">
                      Institution:{' '}
                      {request.Employee?.Institution?.name || 'N/A'}
                    </p>
                  )}
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {request.reason}
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
                    {request.status.includes('Rejected') &&
                      request.status.includes('Awaiting HRO') && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleCorrection(request)}
                        >
                          Correct & Resubmit
                        </Button>
                      )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                No resignation requests found.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(role === ROLES.HHRMD || role === ROLES.HRMO || role === ROLES.CSCS || role === ROLES.HRRP) && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Resignation Requests</CardTitle>
                <CardDescription>
                  Acknowledge and process resignation requests.
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
                      Resignation for: {request.Employee.name} (ZanID:{' '}
                      {request.Employee.zanId})
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
                    Effective Date:{' '}
                    {request.effectiveDate
                      ? format(parseISO(request.effectiveDate), 'PPP')
                      : 'N/A'}
                  </p>
                  {role !== ROLES.HRO && (
                    <p className="text-sm text-muted-foreground">
                      Institution:{' '}
                      {request.Employee?.Institution?.name || 'N/A'}
                    </p>
                  )}
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {request.reason}
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
                    {/* HRMO/HHRMD Review Actions */}
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
              ))
            ) : (
              <p className="text-muted-foreground">
                No resignation requests pending review.
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
              <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                Resignation request for{' '}
                <strong>{selectedRequest.Employee.name}</strong> (ZanID:{' '}
                {selectedRequest.Employee.zanId}).
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
                    {selectedRequest.Employee.name}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    ZanID:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee.zanId}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Payroll #:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee.payrollNumber || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    ZSSF #:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee.zssfNumber || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Department:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee.department}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Cadre/Position:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee.cadre}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Employment Date:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee.employmentDate
                      ? format(
                          typeof selectedRequest.Employee.employmentDate ===
                            'string'
                            ? parseISO(selectedRequest.Employee.employmentDate)
                            : selectedRequest.Employee.employmentDate,
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
                    {selectedRequest.Employee.dateOfBirth
                      ? format(
                          typeof selectedRequest.Employee.dateOfBirth ===
                            'string'
                            ? parseISO(selectedRequest.Employee.dateOfBirth)
                            : selectedRequest.Employee.dateOfBirth,
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
                    {selectedRequest.Employee.institution &&
                    typeof selectedRequest.Employee.institution === 'object'
                      ? selectedRequest.Employee.institution.name
                      : selectedRequest.Employee.institution || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-base text-foreground mb-2">
                  Request Information
                </h4>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold">
                    Effective Date:
                  </Label>
                  <p className="col-span-2">
                    {selectedRequest.effectiveDate
                      ? format(parseISO(selectedRequest.effectiveDate), 'PPP')
                      : 'N/A'}
                  </p>
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
                  <Label className="text-right font-semibold">Submitted:</Label>
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
                  <Label className="text-right font-semibold">Status:</Label>
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
                      const fileName = objectKey.split('/').pop() || objectKey;
                      const shortName = getShortDocumentName(objectKey);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span
                              className="font-medium text-foreground truncate"
                              title={fileName}
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
      )}

      {currentRequestToAction && (
        <Dialog
          open={isRejectionModalOpen}
          onOpenChange={setIsRejectionModalOpen}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Flag Issue on Request: {currentRequestToAction.id}
              </DialogTitle>
              <DialogDescription>
                Please provide the reason for flagging this issue for{' '}
                <strong>{currentRequestToAction.Employee.name}</strong>. The
                request will be returned to the HRO.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Enter reason here..."
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
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectionSubmit}
                disabled={!rejectionReasonInput.trim()}
              >
                Submit Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                folder="resignation/commission-letters"
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

      {requestToCorrect && (
        <Dialog
          open={isCorrectionModalOpen}
          onOpenChange={setIsCorrectionModalOpen}
        >
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Correct Resignation Request: {requestToCorrect.id}
              </DialogTitle>
              <DialogDescription>
                Update the details for{' '}
                <strong>{requestToCorrect.Employee.name}</strong>'s resignation
                request and upload new documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="correctedEffectiveDate"
                    className="flex items-center"
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                    Effective Date of Resignation
                  </Label>
                  <Input
                    id="correctedEffectiveDate"
                    type="date"
                    value={correctedEffectiveDate}
                    onChange={(e) => setCorrectedEffectiveDate(e.target.value)}
                    min={minEffectiveDate}
                  />
                </div>
                <div>
                  <Label htmlFor="correctedReason">
                    Reason for Resignation
                  </Label>
                  <Textarea
                    id="correctedReason"
                    placeholder="Optional: Enter reason stated by employee"
                    value={correctedReason}
                    onChange={(e) => setCorrectedReason(e.target.value)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="correctedLetterOfRequest"
                    className="flex items-center"
                  >
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    Upload Letter of Request (Required, PDF Only)
                  </Label>
                  <FileUpload
                    folder="resignation"
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
                <div>
                  <Label
                    htmlFor="correctedNoticeOrReceipt"
                    className="flex items-center"
                  >
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    Upload 3 months resignation notice or receipt (Required, PDF
                    Only)
                  </Label>
                  <FileUpload
                    folder="resignation"
                    value={correctedNoticeOrReceiptFile}
                    onChange={(key) =>
                      setCorrectedNoticeOrReceiptFile(
                        Array.isArray(key) ? key[0] : key
                      )
                    }
                    onPreview={handlePreviewFile}
                    required
                  />
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
                disabled={
                  !correctedEffectiveDate ||
                  correctedLetterOfRequestFile === '' ||
                  correctedNoticeOrReceiptFile === ''
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

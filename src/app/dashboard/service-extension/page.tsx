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
  CheckSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { EmployeeSearch } from '@/components/shared/employee-search';

interface ServiceExtensionRequest {
  id: string;
  Employee: Partial<Employee & User & { Institution: { name: string } }>;
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

  currentRetirementDate: string;
  requestedExtensionPeriod: string;
  justification: string;
  documents: string[];
}

export default function ServiceExtensionPage() {
  const { role, user } = useAuth();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProbationError, setIsProbationError] = useState(false);
  const [hasPendingServiceExtension, setHasPendingServiceExtension] =
    useState(false);

  const [currentRetirementDate, setCurrentRetirementDate] = useState('');
  const [requestedExtensionPeriod, setRequestedExtensionPeriod] = useState('');
  const [justification, setJustification] = useState('');
  const [employeeConsentLetterFile, setEmployeeConsentLetterFile] =
    useState<string>('');
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  const [pendingRequests, setPendingRequests] = useState<
    ServiceExtensionRequest[]
  >([]);
  const [selectedRequest, setSelectedRequest] =
    useState<ServiceExtensionRequest | null>(null);
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
    useState<ServiceExtensionRequest | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] =
    useState<ServiceExtensionRequest | null>(null);
  const [correctedCurrentRetirementDate, setCorrectedCurrentRetirementDate] =
    useState('');
  const [
    correctedRequestedExtensionPeriod,
    setCorrectedRequestedExtensionPeriod,
  ] = useState('');
  const [correctedJustification, setCorrectedJustification] = useState('');
  const [correctedLetterOfRequestFile, setCorrectedLetterOfRequestFile] =
    useState<string>('');
  const [
    correctedEmployeeConsentLetterFile,
    setCorrectedEmployeeConsentLetterFile,
  ] = useState<string>('');

  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [commissionDecisionType, setCommissionDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [commissionDecisionRequestId, setCommissionDecisionRequestId] = useState<string | null>(null);
  const [commissionLetterFile, setCommissionLetterFile] = useState<string>('');
  const [commissionRejectionReason, setCommissionRejectionReason] = useState('');
  const [isCommissionSubmitting, setIsCommissionSubmitting] = useState(false);

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

        const response = await fetch(
          `/api/service-extension?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Cache-Control': isRefresh
                ? 'no-cache, no-store, must-revalidate'
                : 'default',
              Pragma: isRefresh ? 'no-cache' : 'default',
              Expires: isRefresh ? '0' : 'default',
            },
          }
        );
        if (!response.ok)
          throw new Error('Failed to fetch service extension requests');
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
            description: 'Service extension requests have been updated.',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load service extension requests.',
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
    setCurrentRetirementDate('');
    setRequestedExtensionPeriod('');
    setJustification('');
    setEmployeeConsentLetterFile('');
    setLetterOfRequestFile('');
    setHasPendingServiceExtension(false);
  };

  const handleEmployeeFound = (employee: Employee) => {
    resetFormFields();

    console.log(
      '[SERVICE_EXT] handleEmployeeFound called with employee:',
      employee
    );
    console.log('[SERVICE_EXT] Current pendingRequests:', pendingRequests);
    console.log(
      '[SERVICE_EXT] pendingRequests length:',
      pendingRequests.length
    );

    // Check for pending service extension request
    const pendingStatuses = [
      'Pending HRRP Review',
      'Approved by HRRP - Awaiting Commission Review',
      'Pending HRMO/HHRMD Review',
      'Pending DO/HHRMD Review',
      'Request Received – Awaiting Commission Decision',
    ];

    console.log(
      '[SERVICE_EXT] Checking for pending requests with employee.id:',
      employee.id
    );
    console.log('[SERVICE_EXT] Pending statuses to check:', pendingStatuses);

    const hasPending = pendingRequests.some((req) => {
      console.log('[SERVICE_EXT] Checking request:', {
        requestId: req.id,
        employeeId: req.Employee?.id,
        status: req.status,
        matches:
          req.Employee?.id === employee.id &&
          pendingStatuses.includes(req.status),
      });
      return (
        req.Employee?.id === employee.id && pendingStatuses.includes(req.status)
      );
    });

    console.log('[SERVICE_EXT] hasPending result:', hasPending);

    if (hasPending) {
      setHasPendingServiceExtension(true);
    } else {
      setHasPendingServiceExtension(false);
    }

    setEmployeeDetails(employee);

    // Check if employee is on probation
    setIsProbationError(employee.status === 'On Probation');
  };

  const handleEmployeeClear = () => {
    setEmployeeDetails(null);
    setIsProbationError(false);
    setHasPendingServiceExtension(false);
    resetFormFields();
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
        description: `${actionDescription} for ${request.Employee?.name || 'Unknown'}. Status: ${payload.status}`,
        duration: 3000,
      });
    }

    try {
      const response = await fetchWithCsrf(`/api/service-extension`, {
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
      await fetchRequests(false);

      return true;
    } catch (error) {
      // Revert optimistic update on error
      await fetchRequests(false);
      toast({
        title: 'Update Failed',
        description: 'Could not update the request.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSubmitServiceExtensionRequest = async () => {
    if (!employeeDetails || !user) {
      toast({
        title: 'Submission Error',
        description: 'Employee or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    // Check for pending service extension request
    if (hasPendingServiceExtension) {
      toast({
        title: 'Request Already Submitted',
        description:
          'A service extension request for this employee is already being reviewed. You cannot submit another request until the current one is completed.',
        variant: 'destructive',
        duration: 6000,
      });
      return;
    }

    // Check if employee is on probation
    if (employeeDetails.status === 'On Probation') {
      toast({
        title: 'Submission Not Allowed',
        description:
          'Employees on probation are not eligible for service extension.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !currentRetirementDate ||
      !requestedExtensionPeriod ||
      !justification ||
      !letterOfRequestFile ||
      !employeeConsentLetterFile
    ) {
      toast({
        title: 'Submission Error',
        description:
          'Please fill all required fields and upload both required PDF documents.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Build the documents array with object keys
    const documentObjectKeys: string[] = [];
    if (letterOfRequestFile) documentObjectKeys.push(letterOfRequestFile);
    if (employeeConsentLetterFile)
      documentObjectKeys.push(employeeConsentLetterFile);

    const payload = {
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRRP Review',
      reviewStage: 'initial',
      currentRetirementDate: new Date(currentRetirementDate).toISOString(),
      requestedExtensionPeriod,
      justification,
      documents: documentObjectKeys,
    };

    try {
      const response = await fetchWithCsrf('/api/service-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to submit request');

      await fetchRequests(false); // Refresh list immediately
      toast({
        title: 'Service Extension Request Submitted',
        description: `Request for ${employeeDetails.name} submitted successfully.`,
      });
      setEmployeeDetails(null);
      resetFormFields();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Could not submit the service extension request.',
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
    if (action === 'reject') {
      const request = pendingRequests.find((req) => req.id === requestId);
      if (!request) return;

      setCurrentRequestToAction(request);
      setIsRejectionModalOpen(true);
    } else {
      // Forward to Commission
      const payload = {
        status: 'Request Received – Awaiting Commission Decision',
        reviewStage: 'commission_review',
        reviewedById: user?.id,
        decisionDate: new Date().toISOString(),
      };
      await handleUpdateRequest(
        requestId,
        payload,
        'Request verified and forwarded to Commission'
      );
    }
  };

  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim() || !user)
      return;

    // Determine the correct rejection status based on who is rejecting
    let rejectionStatus: string;
    if (role === ROLES.HRRP) {
      rejectionStatus = 'Rejected by HRRP - Awaiting HRO Correction';
    } else {
      rejectionStatus = `Rejected by ${role} - Awaiting HRO Correction`;
    }

    const payload = {
      status: rejectionStatus,
      rejectionReason: rejectionReasonInput,
      reviewStage: 'hro_correction',
    };
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

  const handleCommissionDecision = async (
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

      const request = pendingRequests.find((req) => req.id === commissionDecisionRequestId);
      const actionDescription = commissionDecisionType === 'approved'
        ? `Service extension approved by Commission!`
        : 'Service extension rejected by Commission';

      const success = await handleUpdateRequest(
        commissionDecisionRequestId,
        payload,
        actionDescription
      );

      if (success && commissionDecisionType === 'approved' && request) {
        const currentDate = new Date(request.currentRetirementDate);
        const extensionPeriod = request.requestedExtensionPeriod.toLowerCase();
        const newDate = new Date(currentDate);

        if (extensionPeriod.includes('year')) {
          const years = parseInt(extensionPeriod.match(/\d+/)?.[0] || '1');
          newDate.setFullYear(newDate.getFullYear() + years);
        } else if (extensionPeriod.includes('month')) {
          const months = parseInt(extensionPeriod.match(/\d+/)?.[0] || '6');
          newDate.setMonth(newDate.getMonth() + months);
        } else {
          newDate.setFullYear(newDate.getFullYear() + 1);
        }

        setTimeout(() => {
          toast({
            title: '✅ Retirement Date Updated',
            description: `${request.Employee?.name || 'Unknown'}'s retirement date has been automatically updated in the system.`,
            duration: 5000,
          });
        }, 1000);
      }

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

  const handleCorrection = (request: ServiceExtensionRequest) => {
    setRequestToCorrect(request);
    setCorrectedCurrentRetirementDate(
      request.currentRetirementDate
        ? format(parseISO(request.currentRetirementDate), 'yyyy-MM-dd')
        : ''
    );
    setCorrectedRequestedExtensionPeriod(
      request.requestedExtensionPeriod || ''
    );
    setCorrectedJustification(request.justification || '');
    setCorrectedLetterOfRequestFile('');
    setCorrectedEmployeeConsentLetterFile('');

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => ((input as HTMLInputElement).value = ''));

    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (
    request: ServiceExtensionRequest | null
  ) => {
    if (!request || !user) {
      toast({
        title: 'Error',
        description: 'Request or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !correctedCurrentRetirementDate ||
      !correctedRequestedExtensionPeriod ||
      !correctedJustification ||
      correctedLetterOfRequestFile === '' ||
      correctedEmployeeConsentLetterFile === ''
    ) {
      toast({
        title: 'Validation Error',
        description:
          'Please fill all required fields and upload required documents.',
        variant: 'destructive',
      });
      return;
    }

    const correctedDocumentObjectKeys: string[] = [];
    if (correctedLetterOfRequestFile)
      correctedDocumentObjectKeys.push(correctedLetterOfRequestFile);
    if (correctedEmployeeConsentLetterFile)
      correctedDocumentObjectKeys.push(correctedEmployeeConsentLetterFile);

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
    toast({
      title: 'Request Corrected & Resubmitted',
      description: `Service extension request for ${request.Employee?.name || 'Unknown'} has been corrected and resubmitted. Status: Pending HRRP Review`,
      duration: 4000,
    });

    // Close modal immediately for better UX
    setIsCorrectionModalOpen(false);
    setRequestToCorrect(null);

    try {
      const response = await fetchWithCsrf(`/api/service-extension`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRRP Review',
          reviewStage: 'initial',
          currentRetirementDate: new Date(
            correctedCurrentRetirementDate
          ).toISOString(),
          requestedExtensionPeriod: correctedRequestedExtensionPeriod,
          justification: correctedJustification,
          documents: correctedDocumentObjectKeys,
          rejectionReason: null,
          reviewedById: null, // Reset reviewer to allow fresh review
        }),
      });

      if (!response.ok) throw new Error('Failed to update request');

      // Force refresh to get accurate server data
      await fetchRequests(false);
    } catch (error) {
      // Revert optimistic update on error and show error feedback
      await fetchRequests(false);
      toast({
        title: 'Update Failed',
        description: 'Could not update the request.',
        variant: 'destructive',
      });
    }
  };

  const paginatedRequests = pendingRequests || [];

  // Manual refresh function
  return (
    <div>
      <PageHeader
        title="Service Extension"
        description="Manage employee service extensions."
      />
      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Service Extension Request</CardTitle>
            <CardDescription>
              Search for an employee by ZANID or Payroll Number, then fill
              extension details and upload required PDF documents.
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
                    </div>
                  </div>
                </div>

                {isProbationError && (
                  <div className="p-4 bg-red-50 border border-red-300 rounded-md">
                    <p className="text-red-700 font-semibold text-sm">
                      ⚠️ Employees on probation are not eligible for service
                      extension.
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      This employee cannot submit a service extension request
                      until their probation period is completed.
                    </p>
                  </div>
                )}

                {hasPendingServiceExtension && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request Already Submitted</AlertTitle>
                    <AlertDescription>
                      A service extension request for this employee is already
                      being reviewed. You cannot submit another request until
                      the current one is completed.
                    </AlertDescription>
                  </Alert>
                )}

                <div
                  className={`space-y-4 ${isProbationError || hasPendingServiceExtension ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <h3 className="text-lg font-medium text-foreground">
                    Service Extension Details &amp; Documents
                  </h3>
                  <div>
                    <Label
                      htmlFor="currentRetirementDate"
                      className="flex items-center"
                    >
                      <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                      Current Retirement Date
                    </Label>
                    <Input
                      id="currentRetirementDate"
                      type="date"
                      value={currentRetirementDate}
                      onChange={(e) => setCurrentRetirementDate(e.target.value)}
                      disabled={
                        isProbationError ||
                        hasPendingServiceExtension ||
                        isSubmitting
                      }
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="requestedExtensionPeriod">
                      Requested Extension Period (e.g., 1 year, 6 months)
                    </Label>
                    <Input
                      id="requestedExtensionPeriod"
                      placeholder="Specify duration of extension"
                      value={requestedExtensionPeriod}
                      onChange={(e) =>
                        setRequestedExtensionPeriod(e.target.value)
                      }
                      disabled={
                        isProbationError ||
                        hasPendingServiceExtension ||
                        isSubmitting
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="justificationServiceExt">
                      Justification for Extension
                    </Label>
                    <Textarea
                      id="justificationServiceExt"
                      placeholder="Provide strong reasons for the service extension"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      disabled={
                        isProbationError ||
                        hasPendingServiceExtension ||
                        isSubmitting
                      }
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="letterOfRequestServiceExt"
                      className="flex items-center"
                    >
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Upload Letter of Request (Required, PDF Only)
                    </Label>
                    <FileUpload
                      folder="service-extension"
                      value={letterOfRequestFile}
                      onChange={(key) =>
                        setLetterOfRequestFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      onPreview={handlePreviewFile}
                      disabled={
                        isProbationError ||
                        hasPendingServiceExtension ||
                        isSubmitting
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="employeeConsentLetterFile"
                      className="flex items-center"
                    >
                      <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                      Upload Employee Consent Letter (Required, PDF Only)
                    </Label>
                    <FileUpload
                      folder="service-extension"
                      value={employeeConsentLetterFile}
                      onChange={(key) =>
                        setEmployeeConsentLetterFile(
                          Array.isArray(key) ? key[0] : key
                        )
                      }
                      onPreview={handlePreviewFile}
                      disabled={
                        isProbationError ||
                        hasPendingServiceExtension ||
                        isSubmitting
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
                onClick={handleSubmitServiceExtensionRequest}
                disabled={
                  !employeeDetails ||
                  hasPendingServiceExtension ||
                  employeeDetails?.status === 'On Probation' ||
                  !currentRetirementDate ||
                  !requestedExtensionPeriod ||
                  !justification ||
                  !letterOfRequestFile ||
                  !employeeConsentLetterFile ||
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

      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Submitted Service Extension Requests</CardTitle>
                <CardDescription>
                  Track the status of service extension requests you have
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
                      Service Extension for: {request.Employee?.name || 'N/A'}{' '}
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
                    Current Retirement:{' '}
                    {request.currentRetirementDate
                      ? format(parseISO(request.currentRetirementDate), 'PPP')
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Extension Requested: {request.requestedExtensionPeriod}
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
                            [
                              'Pending HRRP Review',
                              'Approved by HRRP - Awaiting Commission Review',
                              'Request Received – Awaiting Commission Decision',
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRO Submit</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Approved by HRRP - Awaiting Commission Review',
                              'Request Received – Awaiting Commission Decision',
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
                              ? 'bg-green-500'
                              : request.status === 'Pending HRRP Review'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRRP Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Request Received – Awaiting Commission Decision',
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
                              ? 'bg-green-500'
                              : request.status === 'Approved by HRRP - Awaiting Commission Review'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRMO/HHRMD Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
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
                    {((request.status.includes('Rejected') &&
                      request.status.includes('Awaiting HRO')) ||
                      request.status === 'Rejected by HRRP - Awaiting HRO Correction' ||
                      request.reviewStage === 'hro_correction') && (
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
                No service extension requests found.
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
                <CardTitle>Review Service Extension Requests</CardTitle>
                <CardDescription>
                  Review, approve, or reject pending service extension requests.
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
                      Service Extension for: {request.Employee?.name || 'N/A'}{' '}
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
                    Current Retirement:{' '}
                    {request.currentRetirementDate
                      ? format(parseISO(request.currentRetirementDate), 'PPP')
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Extension Requested: {request.requestedExtensionPeriod}
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
                  {/* Workflow Progress Indicator for Review Section */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Workflow:</span>
                      <div className="flex items-center space-x-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Pending HRRP Review',
                              'Approved by HRRP - Awaiting Commission Review',
                              'Request Received – Awaiting Commission Decision',
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRO Submit</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Approved by HRRP - Awaiting Commission Review',
                              'Request Received – Awaiting Commission Decision',
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
                              ? 'bg-green-500'
                              : request.status === 'Pending HRRP Review'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRRP Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Request Received – Awaiting Commission Decision',
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
                              ? 'bg-green-500'
                              : request.status === 'Approved by HRRP - Awaiting Commission Review'
                                ? 'bg-orange-500'
                                : 'bg-gray-300'
                          }`}
                        ></div>
                        <span className="text-[10px]">HRMO/HHRMD Review</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            [
                              'Approved by Commission',
                              'Rejected by Commission - Request Concluded',
                            ].includes(request.status)
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
                    {(role === ROLES.HRRP) &&
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
                    {(role === ROLES.HRMO || role === ROLES.HHRMD) &&
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
                    {(role === ROLES.HHRMD || role === ROLES.HRMO) &&
                      request.reviewStage === 'commission_review' &&
                      request.status ===
                        'Request Received – Awaiting Commission Decision' && (
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
                No service extension requests pending your review.
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
                Service Extension request for{' '}
                <strong>{selectedRequest.Employee?.name || 'N/A'}</strong>{' '}
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
                    Full Name:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.name || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    ZanID:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.zanId || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Payroll #:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.payrollNumber || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    ZSSF #:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.zssfNumber || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Department:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.department || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Cadre/Position:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.cadre || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-1">
                  <Label className="text-right text-muted-foreground">
                    Employment Date:
                  </Label>
                  <p className="col-span-2 font-medium text-foreground">
                    {selectedRequest.Employee?.employmentDate
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
                    {selectedRequest.Employee?.dateOfBirth
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
                    {typeof selectedRequest.Employee?.institution === 'object'
                      ? selectedRequest.Employee.institution.name
                      : selectedRequest.Employee?.institution || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-base text-foreground mb-2">
                  Request Information
                </h4>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold">
                    Current Retirement:
                  </Label>
                  <p className="col-span-2">
                    {selectedRequest.currentRetirementDate
                      ? format(
                          parseISO(selectedRequest.currentRetirementDate),
                          'PPP'
                        )
                      : 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold">
                    Extension Period:
                  </Label>
                  <p className="col-span-2">
                    {selectedRequest.requestedExtensionPeriod}
                  </p>
                </div>
                <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold pt-1">
                    Justification:
                  </Label>
                  <p className="col-span-2">{selectedRequest.justification}</p>
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
                {selectedRequest.hrrpReviewedBy && (
                  <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                    <Label className="text-right font-semibold">HRRP Reviewed by:</Label>
                    <p className="col-span-2">
                      {selectedRequest.hrrpReviewedBy.name || 'N/A'} (
                      {selectedRequest.hrrpReviewedBy.username || 'N/A'})
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-3 mt-3 border-t">
                {selectedRequest.commissionLetterKey && (
                  <div className="mb-4">
                    <Label className="font-semibold">Barua Rasmi ya Tume</Label>
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-md border bg-secondary/50 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Barua Rasmi ya Tume</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewFile(selectedRequest.commissionLetterKey!)}
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
                              `/api/files/download/${selectedRequest.commissionLetterKey}`,
                              { credentials: 'include' }
                            );
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'Barua_Rasmi_ya_Tume.pdf';
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            }
                          } catch (error) {
                            toast({ title: 'Download Failed', description: 'Could not download the file.', variant: 'destructive' });
                          }
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                )}
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
                Reject Service Extension Request: {currentRequestToAction.id}
              </DialogTitle>
              <DialogDescription>
                Please provide the reason for rejecting the service extension
                request for{' '}
                <strong>
                  {currentRequestToAction.Employee?.name || 'Unknown'}
                </strong>
                . This reason will be visible to the HRO.
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
                folder="service-extension/commission-letters"
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
                Correct & Resubmit Service Extension Request
              </DialogTitle>
              <DialogDescription>
                Address the rejection reasons and update the service extension
                request for{' '}
                <strong>{requestToCorrect.Employee?.name || 'Unknown'}</strong>.
                Make necessary corrections and upload updated documents before
                resubmitting for review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {requestToCorrect.rejectionReason && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <h4 className="font-semibold text-destructive mb-2">
                    Rejection Reason:
                  </h4>
                  <p className="text-sm text-destructive">
                    {requestToCorrect.rejectionReason}
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="correctedCurrentRetirementDate"
                    className="flex items-center"
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                    Current Retirement Date
                  </Label>
                  <Input
                    id="correctedCurrentRetirementDate"
                    type="date"
                    value={correctedCurrentRetirementDate}
                    onChange={(e) =>
                      setCorrectedCurrentRetirementDate(e.target.value)
                    }
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="correctedRequestedExtensionPeriod">
                    Requested Extension Period
                  </Label>
                  <Input
                    id="correctedRequestedExtensionPeriod"
                    placeholder="e.g., 1 year, 6 months"
                    value={correctedRequestedExtensionPeriod}
                    onChange={(e) =>
                      setCorrectedRequestedExtensionPeriod(e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="correctedJustification">
                    Justification for Extension
                  </Label>
                  <Textarea
                    id="correctedJustification"
                    placeholder="Provide detailed justification for the service extension"
                    value={correctedJustification}
                    onChange={(e) => setCorrectedJustification(e.target.value)}
                    rows={4}
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
                    folder="service-extension"
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
                    htmlFor="correctedEmployeeConsentLetter"
                    className="flex items-center"
                  >
                    <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                    Upload Employee Consent Letter (Required, PDF Only)
                  </Label>
                  <FileUpload
                    folder="service-extension"
                    value={correctedEmployeeConsentLetterFile}
                    onChange={(key) =>
                      setCorrectedEmployeeConsentLetterFile(
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
                  !correctedCurrentRetirementDate ||
                  !correctedRequestedExtensionPeriod ||
                  !correctedJustification ||
                  correctedLetterOfRequestFile === '' ||
                  correctedEmployeeConsentLetterFile === ''
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Resubmit Corrected Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Modal */}
      {currentRequestToAction && (
        <Dialog
          open={isRejectionModalOpen}
          onOpenChange={setIsRejectionModalOpen}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reject Service Extension Request</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting the service extension request for{' '}
                <strong>
                  {currentRequestToAction.Employee?.name || 'Unknown'}
                </strong>
                . This will return the request to the HRO for correction.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="rejectionReason">
                  Rejection Reason (Required)
                </Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Provide a clear reason for rejection and guidance for correction..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
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
                Reject Request
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

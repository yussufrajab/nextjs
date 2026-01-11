'use client';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { Pagination } from '@/components/shared/pagination';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { EmployeeSearch } from '@/components/shared/employee-search';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Employee, User, Role } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import {
  Loader2,
  Search,
  FileText,
  Award,
  ChevronsUpDown,
  ListFilter,
  Star,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  Upload,
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

interface PromotionRequest {
  id: string;
  Employee: Partial<Employee & User & { Institution: { name: string } }>;
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
  finalCadre?: string | null;
  promotionType: 'Experience' | 'EducationAdvancement';
  documents: string[];
  studiedOutsideCountry?: boolean | null;
}

export default function PromotionPage() {
  const { role, user } = useAuth();

  const [pendingRequests, setPendingRequests] = useState<PromotionRequest[]>(
    []
  );
  const [selectedRequest, setSelectedRequest] =
    useState<PromotionRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [promotionRequestType, setPromotionRequestType] = useState<
    'experience' | 'education' | ''
  >('');
  const [proposedCadre, setProposedCadre] = useState('');

  // Experience-based promotion files
  const [performanceAppraisalFileY1, setPerformanceAppraisalFileY1] =
    useState<string>('');
  const [performanceAppraisalFileY2, setPerformanceAppraisalFileY2] =
    useState<string>('');
  const [performanceAppraisalFileY3, setPerformanceAppraisalFileY3] =
    useState<string>('');
  const [cscPromotionFormFile, setCscPromotionFormFile] = useState<string>('');

  // Education-based promotion files
  const [certificateFile, setCertificateFile] = useState<string>('');
  const [studiedOutsideCountry, setStudiedOutsideCountry] = useState(false);
  const [tcuFormFile, setTcuFormFile] = useState<string>('');

  // Common file
  const [letterOfRequestFile, setLetterOfRequestFile] = useState<string>('');

  // File preview modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  // Promotion form template state (for HHRMD upload)
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Handle file preview
  const handlePreviewFile = (objectKey: string) => {
    setPreviewObjectKey(objectKey);
    setIsPreviewModalOpen(true);
  };

  // Handle template file upload (HHRMD only)
  const handleTemplateUpload = async () => {
    if (!templateFile || !role || !user) return;

    setIsUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('file', templateFile);
      formData.append('userRole', role);

      const response = await fetch('/api/promotion-form-template/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Success',
          description: 'Promotion form template uploaded successfully. HROs can now download it.',
        });
        setTemplateFile(null);
      } else {
        toast({
          title: 'Upload Failed',
          description: result.message || 'Failed to upload template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Template upload error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while uploading the template',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  // Handle template file download (HRO)
  const handleTemplateDownload = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch('/api/promotion-form-template/download');

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Civil_Service_Commission_Promotion_Form.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Success',
          description: 'Template downloaded successfully',
        });
      } else {
        const result = await response.json();
        toast({
          title: 'Download Failed',
          description: result.message || 'Template not available',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while downloading the template',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
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
    useState<PromotionRequest | null>(null);
  const [isEditingExistingRequest, setIsEditingExistingRequest] =
    useState(false);
  const [isCommissionRejection, setIsCommissionRejection] = useState(false);

  // Commission approval modal states
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalReasonInput, setApprovalReasonInput] = useState('');
  const [finalCadreInput, setFinalCadreInput] = useState('');

  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [hasPendingPromotion, setHasPendingPromotion] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [requestToCorrect, setRequestToCorrect] =
    useState<PromotionRequest | null>(null);
  const [correctedProposedCadre, setCorrectedProposedCadre] = useState('');

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

        // Add cache-busting parameter for refresh
        if (isRefresh) {
          params.append('_t', Date.now().toString());
        }

        const response = await fetch(`/api/promotions?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': isRefresh
              ? 'no-cache, no-store, must-revalidate'
              : 'default',
            Pragma: isRefresh ? 'no-cache' : 'default',
            Expires: isRefresh ? '0' : 'default',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch promotion requests');
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
          setTotalPages(
            data.pagination?.totalPages ||
              Math.ceil(
                (data.pagination?.total || data.data.length) / itemsPerPage
              )
          );
        }

        setPendingRequests(requests);
        if (isRefresh) {
          toast({
            title: 'Refreshed',
            description: 'Promotion requests have been updated.',
            duration: 2000,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load promotion requests.',
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
    [user, role, currentPage, itemsPerPage]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchRequests(false, currentPage);
    }
  }, [currentPage]);

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
    setHasPendingPromotion(false);
  };

  const handleEmployeeFound = (employee: Employee) => {
    console.log(`[PROMOTION] Found employee: ${employee.name}`);

    // Reset form fields when new employee is selected
    resetFormFields();
    setEligibilityError(null);

    // Check eligibility using validation library
    let error = null;

    // First check employee status eligibility (blocks: On Probation, On LWOP, Retired, Resigned, Terminated, Dismissed)
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'promotion'
    );

    if (!statusValidation.isValid) {
      error = statusValidation.message || 'Employee is not eligible for promotion.';
    } else if (employee.employmentDate) {
      // Check years of service requirement
      const yearsOfService = differenceInYears(
        new Date(),
        parseISO(employee.employmentDate.toString())
      );
      if (yearsOfService < 3) {
        error = `Employee must have at least 3 years of service for promotion. Current service: ${yearsOfService} years.`;
      }
    }

    // Check for pending promotion request
    const pendingStatuses = [
      'Pending HRMO/HHRMD Review',
      'Pending DO/HHRMD Review',
      'Request Received – Awaiting Commission Decision',
    ];

    const hasPending = pendingRequests.some(
      (req) =>
        req.Employee?.id === employee.id && pendingStatuses.includes(req.status)
    );

    setHasPendingPromotion(hasPending);
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

  const handleClearEmployee = () => {
    setEmployeeDetails(null);
    resetFormFields();
    setEligibilityError(null);
    setHasPendingPromotion(false);
  };

  const handleSubmitPromotionRequest = async () => {
    if (!!eligibilityError) {
      toast({
        title: 'Submission Error',
        description: 'This employee is ineligible for promotion.',
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

    setIsSubmitting(true);

    const documentsList: string[] = [letterOfRequestFile];
    if (promotionRequestType === 'experience') {
      documentsList.push(
        performanceAppraisalFileY1,
        performanceAppraisalFileY2,
        performanceAppraisalFileY3,
        cscPromotionFormFile
      );
    } else if (promotionRequestType === 'education') {
      documentsList.push(certificateFile);
      if (studiedOutsideCountry && tcuFormFile) documentsList.push(tcuFormFile);
    }

    const method = isEditingExistingRequest ? 'PATCH' : 'POST';
    const url = isEditingExistingRequest
      ? `/api/promotions`
      : '/api/promotions';
    const payload = {
      ...(isEditingExistingRequest && { id: selectedRequest?.id }),
      employeeId: employeeDetails.id,
      submittedById: user.id,
      status: 'Pending HRMO/HHRMD Review', // Both roles can review in parallel
      reviewStage: 'initial',
      proposedCadre,
      promotionType:
        promotionRequestType === 'experience'
          ? 'Experience'
          : 'EducationAdvancement',
      documents: documentsList,
      studiedOutsideCountry:
        promotionRequestType === 'education'
          ? studiedOutsideCountry
          : undefined,
      rejectionReason: null, // Clear rejection reason on resubmission
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Parse JSON first
      const result = await response.json();

      // Check both HTTP status and API response
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit/update request');
      }

      await fetchRequests(); // Refresh list immediately
      toast({
        title: isEditingExistingRequest
          ? 'Promotion Request Updated'
          : 'Promotion Request Submitted',
        description: `Request for ${employeeDetails.name} ${isEditingExistingRequest ? 'updated' : 'submitted'} successfully.`,
      });

      setEmployeeDetails(null);
      resetFormFields();
      setIsEditingExistingRequest(false);
      setSelectedRequest(null);
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Could not submit/update the promotion request.',
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
    if (actionDescription && request && request.Employee) {
      toast({
        title: 'Status Updated',
        description: `${actionDescription} for ${request.Employee.name}. Status: ${payload.status}`,
        duration: 3000,
      });
    }

    try {
      const response = await fetch(`/api/promotions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          ...payload,
          reviewedById: user?.id,
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

  const isSubmitDisabled = () => {
    // Basic validation
    const basicValidation =
      !!eligibilityError ||
      hasPendingPromotion ||
      isSubmitting ||
      !employeeDetails ||
      !promotionRequestType ||
      letterOfRequestFile === '';
    if (basicValidation) {
      return true;
    }

    // Experience-based validation
    if (promotionRequestType === 'experience') {
      const experienceValidation =
        !proposedCadre ||
        performanceAppraisalFileY1 === '' ||
        performanceAppraisalFileY2 === '' ||
        performanceAppraisalFileY3 === '' ||
        cscPromotionFormFile === '';
      return experienceValidation;
    }

    // Education-based validation
    if (promotionRequestType === 'education') {
      const educationValidation =
        certificateFile === '' || (studiedOutsideCountry && tcuFormFile === '');
      return educationValidation;
    }

    return false;
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

    let payload;
    let actionDescription;
    if (isCommissionRejection) {
      // Commission rejection - final, no corrections possible
      payload = {
        status: 'Rejected by Commission - Request Concluded',
        reviewStage: 'completed',
        commissionDecisionReason: rejectionReasonInput,
      };
      actionDescription = 'Promotion request rejected by Commission';
    } else {
      // HRMO/HHRMD rejection - allows HRO correction
      payload = {
        status: `Rejected by ${role} - Awaiting HRO Correction`,
        rejectionReason: rejectionReasonInput,
        reviewStage: 'initial',
      };
      actionDescription = 'Request rejected and returned to HRO';
    }

    const success = await handleUpdateRequest(
      currentRequestToAction.id,
      payload,
      actionDescription
    );
    if (success) {
      setIsRejectionModalOpen(false);
      setCurrentRequestToAction(null);
      setRejectionReasonInput('');
      setIsCommissionRejection(false);
    }
  };

  const handleCommissionDecision = async (
    requestId: string,
    decision: 'approved' | 'rejected'
  ) => {
    const request = pendingRequests.find((req) => req.id === requestId);
    if (!request) return;

    if (decision === 'rejected') {
      // Show modal to enter commission decision reason
      setCurrentRequestToAction(request);
      setRejectionReasonInput('');
      setIsRejectionModalOpen(true);
      // Set a flag to indicate this is a commission rejection
      setIsCommissionRejection(true);
    } else {
      // Show approval modal to enter reason and final cadre (for education-based promotions)
      setCurrentRequestToAction(request);
      setApprovalReasonInput('');
      setFinalCadreInput('');
      setIsApprovalModalOpen(true);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!currentRequestToAction || !approvalReasonInput.trim() || !user) return;

    // Final cadre is required for all promotion types
    if (!finalCadreInput.trim()) {
      toast({
        title: 'Final Cadre Required',
        description: 'You must specify the final cadre and rank for the promotion.',
        variant: 'destructive',
      });
      return;
    }

    const finalStatus = 'Approved by Commission';
    const payload: any = {
      status: finalStatus,
      reviewStage: 'completed',
      commissionDecisionReason: approvalReasonInput,
      finalCadre: finalCadreInput.trim(),
    };

    const actionDescription = `Promotion approved by Commission. Employee ${currentRequestToAction?.Employee?.name || 'Unknown'} rank updated to "${finalCadreInput.trim()}".`;

    const success = await handleUpdateRequest(
      currentRequestToAction.id,
      payload,
      actionDescription
    );

    if (success) {
      setIsApprovalModalOpen(false);
      setCurrentRequestToAction(null);
      setApprovalReasonInput('');
      setFinalCadreInput('');
    }
  };

  const handleCorrection = (request: PromotionRequest) => {
    if (!request.Employee) {
      toast({
        title: 'Error',
        description: 'Employee data is missing for this request.',
        variant: 'destructive',
      });
      return;
    }
    setRequestToCorrect(request);
    setEmployeeDetails(request.Employee as Employee);
    // Properly map the promotionType from the database values to our form values
    const mappedType =
      request.promotionType === 'EducationAdvancement'
        ? 'education'
        : 'experience';
    setPromotionRequestType(mappedType);
    setCorrectedProposedCadre(request.proposedCadre);
    setStudiedOutsideCountry(request.studiedOutsideCountry || false);

    // Clear file inputs - they need to be re-uploaded
    setPerformanceAppraisalFileY1('');
    setPerformanceAppraisalFileY2('');
    setPerformanceAppraisalFileY3('');
    setCscPromotionFormFile('');
    setCertificateFile('');
    setTcuFormFile('');
    setLetterOfRequestFile('');

    setIsCorrectionModalOpen(true);
  };

  const handleConfirmResubmit = async (request: PromotionRequest | null) => {
    if (!request || !user) {
      toast({
        title: 'Error',
        description: 'Request or user details are missing.',
        variant: 'destructive',
      });
      return;
    }

    if (!correctedProposedCadre || letterOfRequestFile === '') {
      toast({
        title: 'Validation Error',
        description: 'Please fill required fields and upload documents.',
        variant: 'destructive',
      });
      return;
    }

    // Validate based on promotion type
    if (promotionRequestType === 'experience') {
      if (
        performanceAppraisalFileY1 === '' ||
        performanceAppraisalFileY2 === '' ||
        performanceAppraisalFileY3 === '' ||
        cscPromotionFormFile === ''
      ) {
        toast({
          title: 'Validation Error',
          description:
            'Please upload all required performance appraisal documents.',
          variant: 'destructive',
        });
        return;
      }
    } else if (promotionRequestType === 'education') {
      if (
        certificateFile === '' ||
        (studiedOutsideCountry && tcuFormFile === '')
      ) {
        toast({
          title: 'Validation Error',
          description: 'Please upload certificate and TCU form if applicable.',
          variant: 'destructive',
        });
        return;
      }
    }

    const documentsList: string[] = [letterOfRequestFile];
    if (promotionRequestType === 'experience') {
      documentsList.push(
        performanceAppraisalFileY1,
        performanceAppraisalFileY2,
        performanceAppraisalFileY3,
        cscPromotionFormFile
      );
    } else if (promotionRequestType === 'education') {
      documentsList.push(certificateFile);
      if (studiedOutsideCountry && tcuFormFile) documentsList.push(tcuFormFile);
    }

    // Optimistic update to immediately hide the "Correct & Resubmit" button and show new status
    const optimisticUpdate = pendingRequests.map((req) =>
      req.id === request.id
        ? {
            ...req,
            status: 'Pending HRMO/HHRMD Review',
            reviewStage: 'initial',
            proposedCadre: correctedProposedCadre,
            rejectionReason: null,
            updatedAt: new Date().toISOString(),
          }
        : req
    );
    setPendingRequests(optimisticUpdate);

    // Show immediate success feedback
    toast({
      title: 'Request Corrected & Resubmitted',
      description: `Promotion request for ${request.Employee?.name || 'employee'} has been corrected and resubmitted. Status: Pending HRMO/HHRMD Review`,
      duration: 4000,
    });

    // Close modal immediately for better UX
    setIsCorrectionModalOpen(false);
    setRequestToCorrect(null);

    try {
      const response = await fetch(`/api/promotions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'Pending HRMO/HHRMD Review',
          reviewStage: 'initial',
          proposedCadre: correctedProposedCadre,
          promotionType:
            promotionRequestType === 'experience'
              ? 'Experience'
              : 'EducationAdvancement',
          documents: documentsList,
          studiedOutsideCountry:
            promotionRequestType === 'education'
              ? studiedOutsideCountry
              : undefined,
          rejectionReason: null,
          reviewedById: user.id, // Reset reviewer to allow fresh review
        }),
      });

      if (!response.ok) throw new Error('Failed to update request');

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

    // Reset form
    setEmployeeDetails(null);
    resetFormFields();
    setCorrectedProposedCadre('');
  };

  const paginatedRequests = pendingRequests || [];

  return (
    <React.Fragment>
      <PageHeader
        title="Promotion"
        description="Manage employee promotions based on experience or education."
      />

      {/* HHRMD Template Upload Section */}
      {role === ROLES.HHRMD && (
        <Card className="mb-6 shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Promotion Form Template
            </CardTitle>
            <CardDescription>
              Upload the Civil Service Commission Promotion Form template
              (Microsoft Word format, max 1MB). This form will be available for
              HROs to download when submitting promotion requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="templateFile" className="mb-2 block">
                Select Word Document (.doc or .docx)
              </Label>
              <Input
                id="templateFile"
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validate file size
                    if (file.size > 1024 * 1024) {
                      toast({
                        title: 'File Too Large',
                        description: 'File size must be less than 1MB',
                        variant: 'destructive',
                      });
                      e.target.value = '';
                      return;
                    }
                    setTemplateFile(file);
                  }
                }}
                disabled={isUploadingTemplate}
              />
              {templateFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {templateFile.name} (
                  {(templateFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={handleTemplateUpload}
              disabled={!templateFile || isUploadingTemplate}
              className="w-full sm:w-auto"
            >
              {isUploadingTemplate && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUploadingTemplate ? 'Uploading...' : 'Upload Template'}
            </Button>
          </CardContent>
        </Card>
      )}

      {role === ROLES.HRO && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Submit Promotion Request</CardTitle>
            <CardDescription>
              Search by ZAN ID or Payroll Number, select promotion type, then
              complete the form. All documents must be PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Download Template Alert */}
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                Download Promotion Form Template
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                  <p className="text-sm">
                    Download the Civil Service Commission Promotion Form template
                    to fill out and upload as part of your promotion request.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTemplateDownload}
                    disabled={isDownloadingTemplate}
                    className="shrink-0 border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900"
                  >
                    {isDownloadingTemplate ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Form
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

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
                                parseISO(
                                  employeeDetails.employmentDate.toString()
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
                                parseISO(
                                  employeeDetails.dateOfBirth.toString()
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
                          {typeof employeeDetails.institution === 'object'
                            ? employeeDetails.institution.name
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

                {hasPendingPromotion && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Request Already Submitted</AlertTitle>
                    <AlertDescription>
                      A promotion request for this employee is already being
                      reviewed. You cannot submit another request until the
                      current one is completed.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="promotionTypeSelect"
                    className="flex items-center"
                  >
                    <ListFilter className="mr-2 h-4 w-4 text-primary" />
                    Promotion Type
                  </Label>
                  <Select
                    value={promotionRequestType}
                    onValueChange={(value) =>
                      setPromotionRequestType(
                        value as 'experience' | 'education' | ''
                      )
                    }
                    disabled={
                      isSubmitting || !!eligibilityError || hasPendingPromotion
                    }
                  >
                    <SelectTrigger id="promotionTypeSelect">
                      <SelectValue placeholder="Select promotion type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="experience">
                        Promotion Based on Experience (Performance)
                      </SelectItem>
                      <SelectItem value="education">
                        Promotion Based on Education Advancement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {promotionRequestType && (
                  <div
                    className={`space-y-4 ${!!eligibilityError || hasPendingPromotion ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <h3 className="text-lg font-medium text-foreground">
                      Promotion Details &amp; Documents (PDF Only)
                    </h3>

                    {promotionRequestType === 'experience' && (
                      <>
                        <div>
                          <Label htmlFor="proposedCadre">
                            Write new cadre and grade
                          </Label>
                          <Input
                            id="proposedCadre"
                            placeholder="e.g., Senior Officer Grade I"
                            value={proposedCadre}
                            onChange={(e) => setProposedCadre(e.target.value)}
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center mb-2">
                            <Star className="mr-2 h-4 w-4 text-primary" />
                            Upload Performance Appraisal Form (Year 1)
                          </Label>
                          <FileUpload
                            value={performanceAppraisalFileY1}
                            onChange={(key) =>
                              setPerformanceAppraisalFileY1(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            folder="promotion/performance-appraisals"
                            accept=".pdf"
                            maxSize={2}
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center mb-2">
                            <Star className="mr-2 h-4 w-4 text-primary" />
                            Upload Performance Appraisal Form (Year 2)
                          </Label>
                          <FileUpload
                            value={performanceAppraisalFileY2}
                            onChange={(key) =>
                              setPerformanceAppraisalFileY2(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            folder="promotion/performance-appraisals"
                            accept=".pdf"
                            maxSize={2}
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center mb-2">
                            <Star className="mr-2 h-4 w-4 text-primary" />
                            Upload Performance Appraisal Form (Year 3)
                          </Label>
                          <FileUpload
                            value={performanceAppraisalFileY3}
                            onChange={(key) =>
                              setPerformanceAppraisalFileY3(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            folder="promotion/performance-appraisals"
                            accept=".pdf"
                            maxSize={2}
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center mb-2">
                            <FileText className="mr-2 h-4 w-4 text-primary" />
                            Upload Civil Service Commission Promotion Form (Tume
                            ya Utumishi)
                          </Label>
                          <FileUpload
                            value={cscPromotionFormFile}
                            onChange={(key) =>
                              setCscPromotionFormFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            folder="promotion/csc-forms"
                            accept=".pdf"
                            maxSize={2}
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                        </div>
                      </>
                    )}

                    {promotionRequestType === 'education' && (
                      <>
                        <div>
                          <Label className="flex items-center mb-2">
                            <Award className="mr-2 h-4 w-4 text-primary" />
                            Upload Academic Certificate
                          </Label>
                          <FileUpload
                            value={certificateFile}
                            onChange={(key) =>
                              setCertificateFile(
                                Array.isArray(key) ? key[0] : key
                              )
                            }
                            folder="promotion/certificates"
                            accept=".pdf"
                            maxSize={2}
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="studiedOutsideCountryPromo"
                            checked={studiedOutsideCountry}
                            onCheckedChange={(checked) =>
                              setStudiedOutsideCountry(checked as boolean)
                            }
                            disabled={
                              isSubmitting ||
                              !!eligibilityError ||
                              hasPendingPromotion
                            }
                          />
                          <Label
                            htmlFor="studiedOutsideCountryPromo"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Employee studied outside the country? (Requires TCU
                            Form)
                          </Label>
                        </div>
                        {studiedOutsideCountry && (
                          <div>
                            <Label className="flex items-center mb-2">
                              <ChevronsUpDown className="mr-2 h-4 w-4 text-primary" />
                              Upload TCU Form
                            </Label>
                            <FileUpload
                              value={tcuFormFile}
                              onChange={(key) =>
                                setTcuFormFile(
                                  Array.isArray(key) ? key[0] : key
                                )
                              }
                              folder="promotion/tcu-forms"
                              accept=".pdf"
                              maxSize={2}
                              disabled={
                                isSubmitting ||
                                !!eligibilityError ||
                                hasPendingPromotion
                              }
                            />
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <Label className="flex items-center mb-2">
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Letter of Request
                      </Label>
                      <FileUpload
                        value={letterOfRequestFile}
                        onChange={(key) =>
                          setLetterOfRequestFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/letters"
                        accept=".pdf"
                        maxSize={2}
                        disabled={
                          isSubmitting ||
                          !!eligibilityError ||
                          hasPendingPromotion
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {employeeDetails && promotionRequestType && (
            <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button
                onClick={handleSubmitPromotionRequest}
                disabled={isSubmitDisabled()}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Promotion Request
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Promotion Requests</CardTitle>
              <CardDescription>
                {pendingRequests.length} request(s) found.
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : paginatedRequests.length > 0 ? (
            paginatedRequests.map((request) => {
              // Skip requests with missing employee data
              if (!request.Employee) {
                console.error('Promotion request missing employee data:', request.id);
                return null;
              }

              return (
              <div
                key={request.id}
                className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    Promotion Request for: {request.Employee.name} (ZanID:{' '}
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
                  Proposed Cadre: {request.proposedCadre}
                </p>
                {request.finalCadre && (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Final Cadre: {request.finalCadre}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Type: {request.promotionType}
                </p>
                <p className="text-sm text-muted-foreground">
                  Submitted:{' '}
                  {request.createdAt
                    ? format(parseISO(request.createdAt), 'PPP')
                    : 'N/A'}{' '}
                  by {request.submittedBy?.name || 'N/A'}
                </p>
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
                          [
                            'Pending HRMO/HHRMD Review',
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
                            'Request Received – Awaiting Commission Decision',
                            'Approved by Commission',
                            'Rejected by Commission - Request Concluded',
                          ].includes(request.status)
                            ? 'bg-green-500'
                            : request.status.includes('Pending HRMO/HHRMD')
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
                  {/* HRMO/HHRMD Parallel Review Actions */}
                  {(role === ROLES.HRMO || role === ROLES.HHRMD) &&
                    request.status === 'Pending HRMO/HHRMD Review' && (
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

                  {/* Commission Decision Actions */}
                  {(role === ROLES.HRMO || role === ROLES.HHRMD) &&
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
                  {role === ROLES.HRO &&
                    (request.status ===
                      'Rejected by HRMO - Awaiting HRO Correction' ||
                      request.status ===
                        'Rejected by HHRMD - Awaiting HRO Correction') && (
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
              );
            })
          ) : (
            <p className="text-muted-foreground">
              No promotion requests found.
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

      {selectedRequest && selectedRequest.Employee && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Request Details: {selectedRequest.id}</DialogTitle>
              <DialogDescription>
                Promotion request for{' '}
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
                    Current Cadre:
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
                          parseISO(
                            selectedRequest.Employee.employmentDate.toString()
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
                    {selectedRequest.Employee.dateOfBirth
                      ? format(
                          parseISO(
                            selectedRequest.Employee.dateOfBirth.toString()
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
                    Promotion Type:
                  </Label>
                  <p className="col-span-2">{selectedRequest.promotionType}</p>
                </div>
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold">
                    Proposed Grade:
                  </Label>
                  <p className="col-span-2">{selectedRequest.proposedCadre}</p>
                </div>
                {selectedRequest.finalCadre && (
                  <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                    <Label className="text-right font-semibold text-green-700 dark:text-green-400">
                      Final Cadre & Rank:
                    </Label>
                    <p className="col-span-2 font-semibold text-green-700 dark:text-green-400">
                      {selectedRequest.finalCadre}
                    </p>
                  </div>
                )}
                {selectedRequest.promotionType === 'EducationAdvancement' && (
                  <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                    <Label className="text-right font-semibold">
                      Studied Outside?:
                    </Label>
                    <p className="col-span-2">
                      {selectedRequest.studiedOutsideCountry ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2">
                  <Label className="text-right font-semibold">Submitted:</Label>
                  <p className="col-span-2">
                    {format(parseISO(selectedRequest.createdAt), 'PPP')} by{' '}
                    {selectedRequest.submittedBy?.name || 'N/A'}
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
                {selectedRequest.commissionDecisionReason && (
                  <div className="grid grid-cols-3 items-start gap-x-4 gap-y-2">
                    <Label className="text-right font-semibold pt-1">
                      Commission Decision Reason:
                    </Label>
                    <p className="col-span-2">
                      {selectedRequest.commissionDecisionReason}
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

      {currentRequestToAction && currentRequestToAction.Employee && (
        <Dialog
          open={isRejectionModalOpen}
          onOpenChange={(open) => {
            setIsRejectionModalOpen(open);
            if (!open) {
              setCurrentRequestToAction(null);
              setIsCommissionRejection(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isCommissionRejection
                  ? 'Commission Decision: Rejection'
                  : `Reject Promotion Request: ${currentRequestToAction.id}`}
              </DialogTitle>
              <DialogDescription>
                Please provide the reason for{' '}
                {isCommissionRejection
                  ? "the Commission's rejection of"
                  : 'rejecting'}{' '}
                the promotion request for{' '}
                <strong>{currentRequestToAction.Employee.name}</strong> (
                {currentRequestToAction.promotionType}).
                {isCommissionRejection
                  ? ' This decision is final and no corrections will be allowed.'
                  : ' This reason will be visible to the HRO for correction.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder={
                  isCommissionRejection
                    ? "Enter Commission's rejection reason..."
                    : 'Enter rejection reason here...'
                }
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
                  setIsCommissionRejection(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectionSubmit}
                disabled={!rejectionReasonInput.trim()}
              >
                {isCommissionRejection
                  ? 'Submit Final Decision'
                  : 'Submit Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Commission Approval Modal */}
      {currentRequestToAction && currentRequestToAction.Employee && (
        <Dialog
          open={isApprovalModalOpen}
          onOpenChange={(open) => {
            setIsApprovalModalOpen(open);
            if (!open) {
              setCurrentRequestToAction(null);
              setApprovalReasonInput('');
              setFinalCadreInput('');
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Commission Decision: Approval</DialogTitle>
              <DialogDescription>
                Approve the promotion request for{' '}
                <strong>{currentRequestToAction.Employee.name}</strong> (
                {currentRequestToAction.promotionType === 'Experience'
                  ? 'Experience-based'
                  : 'Education-based'}{' '}
                promotion). This decision is final.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="approvalReason" className="mb-2 block">
                  Approval Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="approvalReason"
                  placeholder="Enter Commission's approval reason..."
                  value={approvalReasonInput}
                  onChange={(e) => setApprovalReasonInput(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Show proposed cadre for reference (experience-based only) */}
              {currentRequestToAction.promotionType === 'Experience' && (
                <div>
                  <Label className="mb-2 block">
                    Proposed Cadre (from HRO submission)
                  </Label>
                  <Input
                    value={currentRequestToAction.proposedCadre}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Reference only. You must specify the final cadre below.
                  </p>
                </div>
              )}

              {/* Final Cadre input - required for all promotion types */}
              <div>
                <Label htmlFor="finalCadre" className="mb-2 block">
                  Final Cadre and Rank{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="finalCadre"
                  placeholder="e.g., Principal Officer Grade II"
                  value={finalCadreInput}
                  onChange={(e) => setFinalCadreInput(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Specify the final cadre and rank that will be assigned to the
                  employee upon approval.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsApprovalModalOpen(false);
                  setCurrentRequestToAction(null);
                  setApprovalReasonInput('');
                  setFinalCadreInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprovalSubmit}
                disabled={
                  !approvalReasonInput.trim() || !finalCadreInput.trim()
                }
              >
                Approve & Submit Final Decision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {requestToCorrect && requestToCorrect.Employee && (
        <Dialog
          open={isCorrectionModalOpen}
          onOpenChange={setIsCorrectionModalOpen}
        >
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correct & Resubmit Promotion Request</DialogTitle>
              <DialogDescription>
                Address the rejection reasons and update the promotion request
                for <strong>{requestToCorrect.Employee.name}</strong>. Make
                necessary corrections and upload updated documents before
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
                  <Label htmlFor="correctedProposedCadre">
                    Write new cadre and grade
                  </Label>
                  <Input
                    id="correctedProposedCadre"
                    placeholder="e.g., Senior Officer Grade I"
                    value={correctedProposedCadre}
                    onChange={(e) => setCorrectedProposedCadre(e.target.value)}
                  />
                </div>

                {promotionRequestType === 'experience' && (
                  <>
                    <div>
                      <Label className="flex items-center mb-2">
                        <Star className="mr-2 h-4 w-4 text-primary" />
                        Upload Performance Appraisal Form (Year 1)
                      </Label>
                      <FileUpload
                        value={performanceAppraisalFileY1}
                        onChange={(key) =>
                          setPerformanceAppraisalFileY1(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/performance-appraisals"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center mb-2">
                        <Star className="mr-2 h-4 w-4 text-primary" />
                        Upload Performance Appraisal Form (Year 2)
                      </Label>
                      <FileUpload
                        value={performanceAppraisalFileY2}
                        onChange={(key) =>
                          setPerformanceAppraisalFileY2(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/performance-appraisals"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center mb-2">
                        <Star className="mr-2 h-4 w-4 text-primary" />
                        Upload Performance Appraisal Form (Year 3)
                      </Label>
                      <FileUpload
                        value={performanceAppraisalFileY3}
                        onChange={(key) =>
                          setPerformanceAppraisalFileY3(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/performance-appraisals"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center mb-2">
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Civil Service Commission Promotion Form
                      </Label>
                      <FileUpload
                        value={cscPromotionFormFile}
                        onChange={(key) =>
                          setCscPromotionFormFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/csc-forms"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center mb-2">
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Letter of Request
                      </Label>
                      <FileUpload
                        value={letterOfRequestFile}
                        onChange={(key) =>
                          setLetterOfRequestFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/letters"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                  </>
                )}

                {promotionRequestType === 'education' && (
                  <>
                    <div>
                      <Label className="flex items-center mb-2">
                        <Award className="mr-2 h-4 w-4 text-primary" />
                        Upload Academic Certificate
                      </Label>
                      <FileUpload
                        value={certificateFile}
                        onChange={(key) =>
                          setCertificateFile(Array.isArray(key) ? key[0] : key)
                        }
                        folder="promotion/certificates"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="correctedStudiedOutside"
                        checked={studiedOutsideCountry}
                        onCheckedChange={(checked) =>
                          setStudiedOutsideCountry(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="correctedStudiedOutside"
                        className="text-sm font-medium"
                      >
                        Employee studied outside the country? (Requires TCU
                        Form)
                      </Label>
                    </div>
                    {studiedOutsideCountry && (
                      <div>
                        <Label className="flex items-center mb-2">
                          <ChevronsUpDown className="mr-2 h-4 w-4 text-primary" />
                          Upload TCU Form
                        </Label>
                        <FileUpload
                          value={tcuFormFile}
                          onChange={(key) =>
                            setTcuFormFile(Array.isArray(key) ? key[0] : key)
                          }
                          folder="promotion/tcu-forms"
                          accept=".pdf"
                          maxSize={2}
                        />
                      </div>
                    )}
                    <div>
                      <Label className="flex items-center mb-2">
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        Upload Letter of Request
                      </Label>
                      <FileUpload
                        value={letterOfRequestFile}
                        onChange={(key) =>
                          setLetterOfRequestFile(
                            Array.isArray(key) ? key[0] : key
                          )
                        }
                        folder="promotion/letters"
                        accept=".pdf"
                        maxSize={2}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCorrectionModalOpen(false);
                  setRequestToCorrect(null);
                  setEmployeeDetails(null);
                  resetFormFields();
                  setCorrectedProposedCadre('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleConfirmResubmit(requestToCorrect)}
                disabled={
                  !correctedProposedCadre ||
                  letterOfRequestFile === '' ||
                  (promotionRequestType === 'experience' &&
                    (performanceAppraisalFileY1 === '' ||
                      performanceAppraisalFileY2 === '' ||
                      performanceAppraisalFileY3 === '' ||
                      cscPromotionFormFile === '')) ||
                  (promotionRequestType === 'education' &&
                    (certificateFile === '' ||
                      (studiedOutsideCountry && tcuFormFile === '')))
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
        onOpenChange={setIsPreviewModalOpen}
        objectKey={previewObjectKey}
        title="Document Preview"
      />
    </React.Fragment>
  );
}

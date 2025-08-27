
'use client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { ROLES, EMPLOYEES } from '@/lib/constants';
import React, { useState, useEffect } from 'react';
import { standardizeComplaintFormatting } from '@/ai/wrapper';
import type { Role as UserRole } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, Edit3, Send, CheckCircle, XCircle, Info, MessageSquarePlus, Edit, Filter, Phone, Users, FileText, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { format, parseISO } from 'date-fns';

const COMPLAINT_TYPES = [
  "Unyanyasaji",
  "Kuchelewa Kupandishwa Cheo",
  "Kuchelewa Kuthibitishwa",
  "Uongozi Mbaya",
  "Uamuzi Usio wa Haki",
  "Usalama Mahali Kwa Ajira",
  "Ubaguzi",
  "Mengineyo",
];

const phoneValidation = z.string({ required_error: "Namba ya simu inahitajika."})
  .length(10, { message: "Namba ya simu lazima iwe na tarakimu 10 haswa." })
  .startsWith("0", { message: "Namba ya simu lazima ianze na '0'." })
  .regex(/^[0-9]+$/, { message: "Herufi zisizo sahihi. Tarakimu tu ndizo zinazoruhusiwa." });

const complaintSchema = z.object({
  complaintType: z.string().min(1, "Aina ya malalamiko inahitajika."),
  subject: z.string().min(5, "Kichwa lazima kiwe na angalau herufi 5.").max(100, "Kichwa lazima kiwe na herufi 100 au chini yake."),
  complaintText: z.string().min(20, "Maelezo ya malalamiko lazima yawe na angalau herufi 20."),
  complainantPhoneNumber: phoneValidation,
  nextOfKinPhoneNumber: phoneValidation,
  complaintLetter: z.string().optional(),
  evidence: z.string().optional(),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

interface SubmittedComplaint {
  id: string;
  employeeId?: string | null;
  employeeName: string; 
  zanId?: string | null; 
  department?: string | null;
  cadre?: string | null;
  complaintType: string;
  subject: string;
  details: string; 
  complainantPhoneNumber?: string;
  nextOfKinPhoneNumber?: string;
  submissionDate: string;
  status: string;
  attachments?: string[]; 
  officerComments?: string | null;
  internalNotes?: string | null;
  assignedOfficerRole?: string | null;
  reviewStage: string;
  rejectionReason?: string | null;
  reviewedBy?: UserRole | null;
}

export default function ComplaintsPage() {
  const { role, user } = useAuth();
  const { accessToken } = useAuthStore();
  const [rewrittenComplaint, setRewrittenComplaint] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // File preview state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  // File upload state
  const [complaintLetterFile, setComplaintLetterFile] = useState<string>('');
  const [evidenceFile, setEvidenceFile] = useState<string>('');
  const [officerAttachmentFile, setOfficerAttachmentFile] = useState<string>('');

  const [complaints, setComplaints] = useState<SubmittedComplaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<SubmittedComplaint | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false); 
  const [officerActionComment, setOfficerActionComment] = useState('');
  const [officerInternalNote, setOfficerInternalNote] = useState(''); 
  const [actionType, setActionType] = useState<"resolve" | "request_info" | null>(null);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false); 
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentRequestToAction, setCurrentRequestToAction] = useState<SubmittedComplaint | null>(null);

  // Employee provide more info modal
  const [isProvideInfoModalOpen, setIsProvideInfoModalOpen] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [selectedComplaintForInfo, setSelectedComplaintForInfo] = useState<SubmittedComplaint | null>(null);

  // Employee resubmission modal  
  const [isResubmissionModalOpen, setIsResubmissionModalOpen] = useState(false);
  const [selectedComplaintForResubmission, setSelectedComplaintForResubmission] = useState<SubmittedComplaint | null>(null);

  // Commission decision modal
  const [isCommissionDecisionModalOpen, setIsCommissionDecisionModalOpen] = useState(false);
  const [selectedComplaintForCommissionDecision, setSelectedComplaintForCommissionDecision] = useState<SubmittedComplaint | null>(null);
  const [commissionDecision, setCommissionDecision] = useState('');
  const [commissionDecisionType, setCommissionDecisionType] = useState<'resolved' | 'rejected'>('resolved');
  const [commissionLetter, setCommissionLetter] = useState<File | null>(null);


  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      complaintType: "",
      subject: "",
      complaintText: "",
      complainantPhoneNumber: "",
      nextOfKinPhoneNumber: "",
      complaintLetter: "",
      evidence: "",
    },
  });

  const handlePreviewFile = (objectKey: string) => {
    setPreviewObjectKey(objectKey);
    setIsPreviewModalOpen(true);
  };
  
  const fetchComplaints = async (isRefresh = false) => {
    if (!user || !role) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
        // Add cache-busting parameter and headers for refresh
        const cacheBuster = isRefresh ? `&_t=${Date.now()}` : '';
        const response = await fetch(`/api/complaints?userId=${user.id}&userRole=${role}${cacheBuster}`, {
          method: 'GET',
          headers: {
            'Cache-Control': isRefresh ? 'no-cache, no-store, must-revalidate' : 'default',
            'Pragma': isRefresh ? 'no-cache' : 'default',
            'Expires': isRefresh ? '0' : 'default'
          }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch complaints');
        }
        const data = await response.json();
        setComplaints(data);
        if (isRefresh) {
          toast({ title: "Imesasishwa", description: "Malalamiko yamesasishwa.", duration: 2000 });
        }
    } catch (error) {
        toast({ title: "Hitilafu", description: "Imeshindwa kupakia malalamiko.", variant: "destructive" });
    } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user, role]);


  const handleStandardizeComplaint = async () => {
    const complaintText = form.getValues("complaintText");
    if (!complaintText) {
      toast({ title: "Hitilafu ya Kuandika Upya", description: "Tafadhali ingiza maelezo ya lalamiko lako kwanza.", variant: "destructive" });
      return;
    }
    setIsRewriting(true);
    setRewrittenComplaint(null);
    try {
      const result = await standardizeComplaintFormatting({ complaintText });
      setRewrittenComplaint(result.rewrittenComplaint);
      form.setValue("complaintText", result.rewrittenComplaint, { shouldValidate: true }); 
      toast({ title: "Lalamiko Limeboreshwa", description: "AI imeandika upya maelezo ya lalamiko lako kwa uwazi na utimilifu. Yamesasishwa kwenye fomu." });
    } catch (error) {
      console.error("AI Rewrite Error:", error);
      toast({ title: "Kuandika Upya Kumeshindikana", description: "Imeshindwa kuboresha lalamiko kwa kutumia AI.", variant: "destructive" });
    } finally {
      setIsRewriting(false);
    }
  };
  
  const onEmployeeSubmit = async (data: ComplaintFormValues) => {
    if (!user) {
      toast({title: "Hitilafu", description: "Maelezo ya mtumiaji hayajapatikana.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    
    // Create array of uploaded document object keys
    const documentObjectKeys: string[] = [];
    if (complaintLetterFile) documentObjectKeys.push(complaintLetterFile);
    if (evidenceFile) documentObjectKeys.push(evidenceFile);
    
    // Create optimistic complaint for immediate UI feedback
    const optimisticComplaint: SubmittedComplaint = {
      id: `temp-${Date.now()}`,
      employeeId: user.employeeId,
      employeeName: user.name || 'Unknown',
      zanId: null,
      department: null,
      cadre: null,
      complaintType: data.complaintType,
      subject: data.subject,
      details: data.complaintText,
      complainantPhoneNumber: data.complainantPhoneNumber,
      nextOfKinPhoneNumber: data.nextOfKinPhoneNumber,
      submissionDate: new Date().toISOString(),
      status: 'Submitted',
      attachments: documentObjectKeys,
      officerComments: null,
      internalNotes: null,
      assignedOfficerRole: null,
      reviewStage: 'initial',
      rejectionReason: null,
      reviewedBy: null
    };

    // Add optimistic complaint to state for immediate feedback
    setComplaints(prev => [optimisticComplaint, ...prev]);
    
    // Reset form and show immediate success feedback
    form.reset();
    setRewrittenComplaint(null);
    setComplaintLetterFile('');
    setEvidenceFile('');
    setIsSubmitting(false);
    
    toast({ title: "Lalamiko Limewasilishwa", description: "Lalamiko lako limewasilishwa kwa mafanikio." });
    
    try {
        const response = await fetch('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, attachments: documentObjectKeys, complainantId: user.id }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit complaint');
        }

        const newComplaint = await response.json();
        
        // Replace optimistic complaint with real server response
        setComplaints(prev => 
          prev.map(c => 
            c.id === optimisticComplaint.id ? newComplaint : c
          )
        );
    } catch (error) {
        // Remove optimistic complaint on error
        setComplaints(prev => prev.filter(c => c.id !== optimisticComplaint.id));
        toast({ title: "Kuwasilisha Kumeshindikana", description: "Hitilafu imetokea wakati wa kuwasilisha lalamiko lako.", variant: "destructive" });
    }
  };
  
  const updateComplaintState = (updatedComplaint: SubmittedComplaint) => {
      setComplaints(prev => prev.map(c => c.id === updatedComplaint.id ? { ...c, ...updatedComplaint } : c));
  };

  const handleUpdateComplaint = async (complaintId: string, payload: any) => {
      try {
          const response = await fetch(`/api/complaints/${complaintId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('Failed to update complaint');
          const updatedComplaint = await response.json();
          // Note: We no longer update state here since we're using optimistic updates
          return updatedComplaint;
      } catch (error) {
          console.error('Error updating complaint:', error);
          return null;
      }
  };


  const handleInitialAction = async (complaintId: string, action: 'reject_initial') => {
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    if (action === 'reject_initial') {
      setCurrentRequestToAction(complaint);
      setRejectionReasonInput(''); 
      setIsRejectionModalOpen(true);
    }
  };
  
  const handleRejectionSubmit = async () => {
    if (!currentRequestToAction || !rejectionReasonInput.trim()) {
      toast({ title: "Hitilafu ya Kukataa", description: "Sababu ya kukataa inahitajika.", variant: "destructive" });
      return;
    }
    const { id, employeeName } = currentRequestToAction;
    const rejectedByRole = role === ROLES.DO ? "DO" : "HHRMD";

    const newStatus = `Rejected by ${rejectedByRole} – Waiting submitter reaction`;
    
    // Optimistic update
    const optimisticUpdate = complaints.map(c => 
      c.id === id 
        ? { 
            ...c, 
            status: newStatus,
            rejectionReason: rejectionReasonInput,
            reviewStage: 'initial',
            reviewedBy: role
          }
        : c
    );
    setComplaints(optimisticUpdate);

    // Close modal immediately for better UX
    setIsRejectionModalOpen(false);
    setCurrentRequestToAction(null);
    setRejectionReasonInput('');

    // Show immediate feedback
    toast({ title: "Lalamiko Limekataliwa", description: `Lalamiko ${id} la ${employeeName} limekataliwa.`, variant: 'destructive' });

    const payload = {
        status: newStatus,
        rejectionReason: rejectionReasonInput,
        reviewStage: 'initial',
        reviewedById: user?.id
    };

    try {
      const updated = await handleUpdateComplaint(id, payload);
      if (!updated) {
        // Revert optimistic update on failure
        setComplaints(complaints);
        toast({ title: "Hitilafu", description: "Imeshindwa kukataa lalamiko.", variant: "destructive" });
      }
    } catch (error) {
      // Revert optimistic update on error
      setComplaints(complaints);
      toast({ title: "Hitilafu", description: "Imeshindwa kukataa lalamiko.", variant: "destructive" });
    }
  };


  const openActionModal = (complaint: SubmittedComplaint, type: "resolve" | "request_info") => {
    setSelectedComplaint(complaint);
    setActionType(type); 
    setOfficerActionComment(complaint.officerComments || '');
    setOfficerInternalNote(complaint.internalNotes || '');
    setOfficerAttachmentFile(''); // Clear any previous attachment
    setIsActionModalOpen(true);
  };
  
  const handleOfficerSubmitLegacyAction = async () => {
    if (!selectedComplaint || !actionType || !officerActionComment.trim()) {
      toast({title: "Hitilafu ya Hatua", description: "Maoni ya afisa yanahitajika.", variant: "destructive"});
      return;
    }

    let newStatus: string = selectedComplaint.status;
    let toastMessage = "";

    if (actionType === 'resolve') {
      newStatus = "Resolved - Pending Employee Confirmation";
      toastMessage = `Lalamiko ${selectedComplaint.id} limewekwa kama Limetatuliwa.`;
    } else if (actionType === 'request_info') {
      newStatus = "Awaiting More Information";
      toastMessage = `Maelezo zaidi yameombwa kwa lalamiko ${selectedComplaint.id}.`;
    }
    
    // Prepare updated attachments for optimistic update
    const optimisticAttachments = [...(selectedComplaint.attachments || [])];
    if (officerAttachmentFile) {
      optimisticAttachments.push(officerAttachmentFile);
    }

    // Optimistic update
    const optimisticUpdate = complaints.map(c => 
      c.id === selectedComplaint.id 
        ? { 
            ...c, 
            status: newStatus,
            officerComments: officerActionComment,
            internalNotes: officerInternalNote,
            assignedOfficerRole: role,
            reviewStage: 'completed',
            reviewedBy: role,
            ...(officerAttachmentFile && { attachments: optimisticAttachments })
          }
        : c
    );
    setComplaints(optimisticUpdate);

    // Close modal immediately for better UX
    setIsActionModalOpen(false);
    setSelectedComplaint(null);
    setOfficerActionComment('');
    setOfficerInternalNote('');
    setOfficerAttachmentFile('');
    setActionType(null);

    // Show immediate feedback
    toast({ title: "Hatua Imechukuliwa", description: toastMessage });

    // Add officer attachment to current attachments if provided
    const updatedAttachments = [...(selectedComplaint.attachments || [])];
    if (officerAttachmentFile) {
      updatedAttachments.push(officerAttachmentFile);
    }

    const payload = {
        status: newStatus,
        officerComments: officerActionComment,
        internalNotes: officerInternalNote,
        assignedOfficerRole: role,
        reviewStage: 'completed',
        reviewedById: user?.id,
        ...(officerAttachmentFile && { attachments: updatedAttachments })
    };

    try {
      const updated = await handleUpdateComplaint(selectedComplaint.id, payload);
      if (!updated) {
        // Revert optimistic update on failure
        setComplaints(complaints);
        toast({ title: "Hitilafu", description: "Imeshindwa kuchukua hatua.", variant: "destructive" });
      }
    } catch (error) {
      // Revert optimistic update on error
      setComplaints(complaints);
      toast({ title: "Hitilafu", description: "Imeshindwa kuchukua hatua.", variant: "destructive" });
    }
  };

  const handleEmployeeConfirmOutcome = async (complaintId: string) => {
    // Optimistic update
    const optimisticUpdate = complaints.map(c => 
      c.id === complaintId 
        ? { ...c, status: "Mtumishi ameridhika na hatua" }
        : c
    );
    setComplaints(optimisticUpdate);

    // Show immediate feedback
    toast({title: "Thibitisho Limekamilika", description: "Asante kwa kuthibitisha. Lalamiko limekamilika."});

    const payload = { status: "Mtumishi ameridhika na hatua" };
    
    try {
      const updated = await handleUpdateComplaint(complaintId, payload);
      if (!updated) {
        // Revert optimistic update on failure
        setComplaints(complaints);
        toast({title: "Hitilafu", description: "Imeshindwa kuthibitisha.", variant: "destructive"});
      }
    } catch (error) {
      // Revert optimistic update on error
      setComplaints(complaints);
      toast({title: "Hitilafu", description: "Imeshindwa kuthibitisha.", variant: "destructive"});
    }
  };

  const openProvideInfoModal = (complaint: SubmittedComplaint) => {
    setSelectedComplaintForInfo(complaint);
    setAdditionalInfo('');
    setIsProvideInfoModalOpen(true);
  };

  const openResubmissionModal = (complaint: SubmittedComplaint) => {
    setSelectedComplaintForResubmission(complaint);
    // Pre-populate form with existing complaint data
    form.reset({
      complaintType: complaint.complaintType,
      subject: complaint.subject,
      complaintText: complaint.details,
      complainantPhoneNumber: complaint.complainantPhoneNumber || '',
      nextOfKinPhoneNumber: complaint.nextOfKinPhoneNumber || '',
    });
    setIsResubmissionModalOpen(true);
  };

  const handleProvideAdditionalInfo = async () => {
    if (!selectedComplaintForInfo || !additionalInfo.trim()) {
      toast({title: "Hitilafu", description: "Tafadhali toa maelezo ya ziada yaliyoombwa.", variant: "destructive"});
      return;
    }

    const newOfficerComments = `${selectedComplaintForInfo.officerComments || ''}\n\n--- Additional Information from Employee ---\n${additionalInfo}`;
    
    // Optimistic update
    const optimisticUpdate = complaints.map(c => 
      c.id === selectedComplaintForInfo.id 
        ? { 
            ...c, 
            status: "Under Review - Additional Information Provided",
            officerComments: newOfficerComments,
            reviewStage: 'initial'
          }
        : c
    );
    setComplaints(optimisticUpdate);

    // Close modal immediately for better UX
    setIsProvideInfoModalOpen(false);
    setSelectedComplaintForInfo(null);
    setAdditionalInfo('');

    // Show immediate feedback
    toast({title: "Maelezo Yametolewa", description: "Maelezo yako ya ziada yamewasilishwa kwa ukaguzi."});

    const payload = {
      status: "Under Review - Additional Information Provided",
      officerComments: newOfficerComments,
      reviewStage: 'initial'
    };

    try {
      const updated = await handleUpdateComplaint(selectedComplaintForInfo.id, payload);
      if (!updated) {
        // Revert optimistic update on failure
        setComplaints(complaints);
        toast({title: "Hitilafu", description: "Imeshindwa kutoa maelezo.", variant: "destructive"});
      }
    } catch (error) {
      // Revert optimistic update on error
      setComplaints(complaints);
      toast({title: "Hitilafu", description: "Imeshindwa kutoa maelezo.", variant: "destructive"});
    }
  };

  const handleResubmitComplaint = async (data: ComplaintFormValues) => {
    if (!selectedComplaintForResubmission) return;

    setIsSubmitting(true);
    
    // Optimistic update
    const optimisticUpdate = complaints.map(c => 
      c.id === selectedComplaintForResubmission.id 
        ? { 
            ...c,
            complaintType: data.complaintType,
            subject: data.subject,
            details: data.complaintText,
            complainantPhoneNumber: data.complainantPhoneNumber,
            nextOfKinPhoneNumber: data.nextOfKinPhoneNumber,
            status: 'Submitted',
            rejectionReason: null,
            reviewStage: 'initial'
          }
        : c
    );
    setComplaints(optimisticUpdate);

    // Close modal immediately for better UX
    setIsResubmissionModalOpen(false);
    setSelectedComplaintForResubmission(null);
    form.reset();
    setRewrittenComplaint(null);
    setIsSubmitting(false);

    // Show immediate feedback
    toast({title: "Lalamiko Limewasilishwa Upya", description: "Lalamiko lako limerekebihwa na kuwasilishwa upya kwa ukaguzi."});

    try {
      const payload = {
        complaintType: data.complaintType,
        subject: data.subject,
        details: data.complaintText,
        complainantPhoneNumber: data.complainantPhoneNumber,
        nextOfKinPhoneNumber: data.nextOfKinPhoneNumber,
        status: 'Submitted',
        rejectionReason: null,
        reviewStage: 'initial'
      };

      const updated = await handleUpdateComplaint(selectedComplaintForResubmission.id, payload);
      if (!updated) {
        // Revert optimistic update on failure
        setComplaints(complaints);
        toast({title: "Kushindwa Kuwasilisha", description: "Imeshindwa kuwasilisha upya lalamiko.", variant: "destructive"});
      }
    } catch (error) {
      // Revert optimistic update on error
      setComplaints(complaints);
      toast({title: "Kushindwa Kuwasilisha", description: "Imeshindwa kuwasilisha upya lalamiko.", variant: "destructive"});
    }
  };

  const openCommissionDecisionModal = (complaint: SubmittedComplaint) => {
    setSelectedComplaintForCommissionDecision(complaint);
    setCommissionDecision('');
    setCommissionDecisionType('resolved');
    setCommissionLetter(null);
    setIsCommissionDecisionModalOpen(true);
  };

  const handleCommissionDecision = async () => {
    if (!selectedComplaintForCommissionDecision || !commissionDecision.trim()) {
      toast({title: "Hitilafu", description: "Tafadhali toa maamuzi ya tume.", variant: "destructive"});
      return;
    }

    // Require commission letter for resolved complaints
    if (commissionDecisionType === 'resolved' && !commissionLetter) {
      toast({title: "Hitilafu", description: "Tafadhali chagua barua ya tume kwa maamuzi yaliyotatuliwa.", variant: "destructive"});
      return;
    }

    setIsSubmitting(true);
    
    const finalStatus = commissionDecisionType === 'resolved' 
      ? 'Closed - Commission Decision (Resolved)' 
      : 'Closed - Commission Decision (Rejected)';
    
    // Optimistic update
    const optimisticUpdate = complaints.map(c => 
      c.id === selectedComplaintForCommissionDecision.id 
        ? { 
            ...c,
            status: finalStatus,
            officerComments: commissionDecision,
            reviewStage: 'final_decision',
            reviewedBy: role
          }
        : c
    );
    setComplaints(optimisticUpdate);

    // Close modal immediately for better UX
    setIsCommissionDecisionModalOpen(false);
    setSelectedComplaintForCommissionDecision(null);
    setCommissionDecision('');
    setCommissionLetter(null);
    setIsSubmitting(false);

    // Show immediate feedback
    toast({
      title: "Maamuzi ya Tume Yamewekwa", 
      description: `Lalamiko limefungwa rasmi. Hakuna uwezekano wa kuliwasilisha upya.`
    });

    try {
      let commissionLetterUrl = null;
      
      // Upload commission letter if provided
      if (commissionLetter) {
        const formData = new FormData();
        formData.append('file', commissionLetter);
        
        // Note: We'll need to implement file upload endpoint, for now simulate
        console.log('Commission letter would be uploaded:', commissionLetter.name);
        commissionLetterUrl = `uploads/commission-letters/${commissionLetter.name}`;
      }

      const payload = {
        status: finalStatus,
        officerComments: commissionDecision,
        reviewStage: 'final_decision',
        reviewedById: user?.id,
        // Add commission letter URL to attachments if available
        ...(commissionLetterUrl && { 
          attachments: [commissionLetterUrl] 
        })
      };

      const updated = await handleUpdateComplaint(selectedComplaintForCommissionDecision.id, payload);
      if (!updated) {
        // Revert optimistic update on failure
        setComplaints(complaints);
        toast({title: "Kushindwa", description: "Imeshindwa kuweka maamuzi ya tume.", variant: "destructive"});
      }
    } catch (error) {
      // Revert optimistic update on error
      setComplaints(complaints);
      toast({title: "Kushindwa", description: "Imeshindwa kuweka maamuzi ya tume.", variant: "destructive"});
    }
  };
  
  // Both DO and HHRMD should see all complaints assigned to either role
  const allOfficerComplaints = complaints.filter(c => 
    (role === ROLES.DO || role === ROLES.HHRMD) && 
    (c.assignedOfficerRole === ROLES.DO || c.assignedOfficerRole === ROLES.HHRMD)
  );
  
  // Separate active and completed complaints for better organization
  const activeComplaints = allOfficerComplaints.filter(c => 
    !['Closed - Satisfied', 'Mtumishi ameridhika na hatua', 'Closed - Commission Decision (Resolved)', 'Closed - Commission Decision (Rejected)'].includes(c.status)
  );
  
  const completedComplaints = allOfficerComplaints.filter(c => 
    ['Closed - Satisfied', 'Mtumishi ameridhika na hatua', 'Closed - Commission Decision (Resolved)', 'Closed - Commission Decision (Rejected)'].includes(c.status)
  );
  const employeeSubmittedComplaints = complaints.filter(c => c.employeeId === user?.employeeId);

  return (
    <div>
      <PageHeader title="Usimamizi wa Malalamiko" description="Wasilisha, tazama, na simamia malalamiko ya wafanyakazi." />
      
      {role === ROLES.EMPLOYEE && (
        <>
        <Card className="shadow-lg mb-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Malalamiko Yangu Niliyowasilisha</CardTitle>
                        <CardDescription>Fuatilia hali ya malalamiko uliyowasilisha.</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchComplaints(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Sasisha
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : employeeSubmittedComplaints.length > 0 ? (
                    employeeSubmittedComplaints.map(complaint => (
                        <div key={complaint.id} className="mb-4 border p-4 rounded-md space-y-3 shadow-sm bg-background hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-base">{complaint.subject}</h3>
                                    <p className="text-sm text-muted-foreground">Aina: {complaint.complaintType} | Tarehe ya Kuwasilisha: {format(parseISO(complaint.submissionDate), 'PPP')}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    complaint.status === "Closed - Satisfied" ? "bg-green-100 text-green-700" :
                                    complaint.status === "Mtumishi ameridhika na hatua" ? "bg-green-100 text-green-700" :
                                    complaint.status.startsWith("Resolved") ? "bg-blue-100 text-blue-700" :
                                    complaint.status.startsWith("Rejected") ? "bg-red-100 text-red-700" :
                                    complaint.status === "Awaiting More Information" ? "bg-yellow-100 text-yellow-700" :
                                    complaint.status === "Under Review - Additional Information Provided" ? "bg-purple-100 text-purple-700" :
                                    complaint.status === "lalamiko lako limepokelewa, linafanyiwa kazi" ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-700"
                                }`}>{complaint.status}</span>
                            </div>
                            {/* Workflow Progress Indicator for Complaints */}
                            <div className="flex items-center space-x-2 mt-2">
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    <span>Workflow:</span>
                                    <div className="flex items-center space-x-1">
                                        <div className={`w-2 h-2 rounded-full ${
                                            ['Submitted', 'lalamiko lako limepokelewa, linafanyiwa kazi', 'Awaiting More Information', 'Under Review - Additional Information Provided', 'Resolved - Pending Employee Confirmation', 'Rejected - Pending Employee Confirmation', 'Mtumishi ameridhika na hatua', 'Closed - Satisfied'].includes(complaint.status) || complaint.status.startsWith('Resolved') || complaint.status.startsWith('Rejected by') 
                                            ? 'bg-green-500' : 'bg-gray-300'
                                        }`}></div>
                                        <span className="text-[10px]">Wasilisha</span>
                                        <div className="w-3 h-px bg-gray-300"></div>
                                        <div className={`w-2 h-2 rounded-full ${
                                            ['lalamiko lako limepokelewa, linafanyiwa kazi', 'Under Review - Additional Information Provided', 'Resolved - Pending Employee Confirmation', 'Rejected - Pending Employee Confirmation', 'Mtumishi ameridhika na hatua', 'Closed - Satisfied'].includes(complaint.status) || complaint.status.startsWith('Resolved') || complaint.status.startsWith('Rejected by')
                                            ? 'bg-green-500' : complaint.status === 'Awaiting More Information' ? 'bg-orange-500' : 'bg-gray-300'
                                        }`}></div>
                                        <span className="text-[10px]">Mkaguzi</span>
                                        <div className="w-3 h-px bg-gray-300"></div>
                                        <div className={`w-2 h-2 rounded-full ${
                                            ['Mtumishi ameridhika na hatua', 'Closed - Satisfied'].includes(complaint.status)
                                            ? 'bg-green-500' : (complaint.status === 'Resolved - Pending Employee Confirmation' || complaint.status === 'Rejected - Pending Employee Confirmation') ? 'bg-blue-500' : complaint.status.startsWith('Resolved') || complaint.status.startsWith('Rejected by') ? 'bg-orange-500' : 'bg-gray-300'
                                        }`}></div>
                                        <span className="text-[10px]">Malizika</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm "><strong className="text-muted-foreground">Maelezo:</strong> {complaint.details.substring(0,150)}{complaint.details.length > 150 ? '...' : ''}</p>
                            {complaint.officerComments && (complaint.status.startsWith("Resolved") || complaint.status.startsWith("Rejected by") || complaint.status === "Awaiting More Information") && (
                                <Card className="mt-2 bg-secondary/30">
                                    <CardHeader className="pb-1 pt-2">
                                        <CardTitle className="text-sm font-medium">Maoni ya Afisa / Sababu:</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <p className="text-sm text-muted-foreground">{complaint.officerComments}</p>
                                    </CardContent>
                                </Card>
                            )}
                            {complaint.rejectionReason && complaint.status.startsWith("Rejected by") && (
                                <Card className="mt-2 bg-red-50 border-red-200">
                                    <CardHeader className="pb-1 pt-2">
                                        <CardTitle className="text-sm font-medium text-red-700">Sababu ya Kukataliwa:</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <p className="text-sm text-red-600">{complaint.rejectionReason}</p>
                                        {complaint.status.includes("Waiting submitter reaction") && (
                                            <div className="mt-3 pt-3 border-t border-red-200">
                                                <p className="text-sm text-red-700 mb-2 font-medium">Unaweza kurekebisha na kuwasilisha upya lalamiko lako:</p>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => openResubmissionModal(complaint)}
                                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                                >
                                                    <Edit className="mr-2 h-4 w-4"/>
                                                    Rekebisha na Wasilisha Upya
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                            {(complaint.status === "Resolved - Pending Employee Confirmation" || complaint.status === "Rejected - Pending Employee Confirmation") && (
                                <div className="mt-3 pt-3 border-t">
                                    <Button size="sm" onClick={() => handleEmployeeConfirmOutcome(complaint.id)} className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckCircle className="mr-2 h-4 w-4"/>
                                        Thibitisha Matokeo na Funga Lalamiko
                                    </Button>
                                </div>
                            )}
                             {complaint.status === "Awaiting More Information" && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm text-amber-700 font-medium mb-3">Afisa mkaguzi ameomba maelezo zaidi. Tafadhali kagua maoni yao na toa maelezo ya ziada hapa chini.</p>
                                    <Button size="sm" onClick={() => openProvideInfoModal(complaint)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <MessageSquarePlus className="mr-2 h-4 w-4"/>
                                        Toa Maelezo ya Ziada
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground">Bado hujawasilisha malalamiko yoyote.</p>
                )}
            </CardContent>
        </Card>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Wasilisha Lalamiko Jipya</CardTitle>
            <CardDescription>Eleza lalamiko lako kwa uwazi. Unaweza kutumia zana ya AI kusaidia kuboresha maandishi katika sehemu ya maelezo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onEmployeeSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="complaintType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aina ya Lalamiko *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chagua aina ya lalamiko lako" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMPLAINT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kichwa / Mada *</FormLabel>
                      <FormControl>
                        <Input placeholder="Fupisha lalamiko lako kwa ufupi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complaintText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maelezo ya Kina *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Toa maelezo kamili ya lalamiko lako..." {...field} rows={6} />
                      </FormControl>
                       <p className="text-sm text-muted-foreground pt-1">
                        Unaweza kutumia zana ya AI hapo chini kusaidia kuboresha maelezo yako kwa uwazi na utimilifu.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complainantPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-primary"/>Namba Yako ya Simu ya Sasa *</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Ingiza namba yako ya simu, mfano: 0777123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextOfKinPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary"/>Namba ya Simu ya Mlezi / Mdhamini *</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Ingiza namba ya simu ya mlezi, mfano: 0777123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="complaintLetter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary"/>Barua ya Lalamiko (PDF)</FormLabel>
                      <FormControl>
                        <FileUpload
                          value={complaintLetterFile}
                          onChange={(objectKey) => {
                            setComplaintLetterFile(objectKey);
                            field.onChange(objectKey);
                          }}
                          folder="complaints"
                          maxSize={1.2}
                          accept=".pdf"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Pakia barua yako ya lalamiko kwa muundo wa PDF
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="evidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pakia Vifungo vingine (Si Lazima, PDF)</FormLabel>
                      <FormControl>
                        <FileUpload
                          value={evidenceFile}
                          onChange={(objectKey) => {
                            setEvidenceFile(objectKey);
                            field.onChange(objectKey);
                          }}
                          folder="complaints"
                          maxSize={1.2}
                          accept=".pdf"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleStandardizeComplaint} disabled={isRewriting}>
                    {isRewriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4"/>}
                    Boresha Maelezo kwa AI
                  </Button>
                  <Button type="submit" disabled={isRewriting || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                    Wasilisha Lalamiko
                  </Button>
                </div>
              </form>
            </Form>
            {rewrittenComplaint && !isRewriting && (
              <Card className="mt-4 bg-secondary/50">
                <CardHeader>
                  <CardTitle className="text-base">Pendekezo la AI (Limesasishwa kwenye Fomu)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>{rewrittenComplaint}</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        </>
      )}

      {(role === ROLES.DO || role === ROLES.HHRMD) && (
        <>
          {/* Active Complaints Section */}
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                  <div>
                      <CardTitle>Malalamiko Yanayosubiri Ukaguzi</CardTitle>
                      <CardDescription>Malalamiko yanayohitaji hatua yako ya haraka - kagua, chukua hatua, au omba maelezo zaidi.</CardDescription>
                  </div>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchComplaints(true)}
                      disabled={isRefreshing}
                      className="flex items-center gap-2"
                  >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Sasisha
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                   <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
              ) : activeComplaints.length > 0 ? (
              activeComplaints.map((complaint) => (
                <div key={complaint.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-background hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-base">{complaint.subject} (Type: {complaint.complaintType})</h3>
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        complaint.status === "Submitted" ? "bg-orange-100 text-orange-700" : 
                        complaint.status === "Under Review" ? "bg-blue-100 text-blue-700" :
                        complaint.status === "Under Review - Additional Information Provided" ? "bg-purple-100 text-purple-700" :
                        complaint.status === "Mtumishi ameridhika na hatua" ? "bg-green-100 text-green-700" :
                        complaint.status === "lalamiko lako limepokelewa, linafanyiwa kazi" ? "bg-blue-100 text-blue-700" :
                        complaint.status.startsWith("Resolved") ? "bg-green-100 text-green-700" :
                        complaint.status.startsWith("Rejected") ? "bg-red-100 text-red-700" :
                        complaint.status.startsWith("Closed - Commission Decision") ? "bg-gray-100 text-gray-700" :
                        "bg-gray-100 text-gray-700"
                    }`}>{complaint.status}</span>
                  </div>
                  {/* Workflow Progress Indicator for Complaints */}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>Workflow:</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          ['Submitted', 'lalamiko lako limepokelewa, linafanyiwa kazi', 'Under Review', 'Under Review - Additional Information Provided', 'Resolved - Pending Employee Confirmation', 'Rejected - Pending Employee Confirmation', 'Mtumishi ameridhika na hatua', 'Closed - Satisfied'].includes(complaint.status) || complaint.status.startsWith('Resolved') || complaint.status.startsWith('Rejected by') || complaint.status.startsWith('Closed - Commission')
                          ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-[10px]">Wasilisha</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          ['lalamiko lako limepokelewa, linafanyiwa kazi', 'Under Review', 'Under Review - Additional Information Provided', 'Resolved - Pending Employee Confirmation', 'Rejected - Pending Employee Confirmation', 'Mtumishi ameridhika na hatua', 'Closed - Satisfied'].includes(complaint.status) || complaint.status.startsWith('Resolved') || complaint.status.startsWith('Rejected by') || complaint.status.startsWith('Closed - Commission')
                          ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-[10px]">Mkaguzi</span>
                        <div className="w-3 h-px bg-gray-300"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          ['Mtumishi ameridhika na hatua', 'Closed - Satisfied'].includes(complaint.status)
                          ? 'bg-green-500' : (complaint.status === 'Resolved - Pending Employee Confirmation' || complaint.status === 'Rejected - Pending Employee Confirmation') ? 'bg-blue-500' : complaint.status.startsWith('Resolved') || complaint.status.startsWith('Rejected by') || complaint.status.startsWith('Closed - Commission') ? 'bg-orange-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-[10px]">Malizika</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From: {complaint.employeeName} {complaint.zanId ? `(ZanID: ${complaint.zanId})` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">Submitted: {format(parseISO(complaint.submissionDate), 'PPP')}</p>
                  <p className="text-sm mt-1"><strong>Details Preview:</strong> {complaint.details.substring(0, 150)}{complaint.details.length > 150 ? "..." : ""}</p>
                  {complaint.rejectionReason && <p className="text-sm text-destructive"><span className="font-medium">Rejection Reason:</span> {complaint.rejectionReason}</p>}
                  
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                        setSelectedComplaint(complaint);
                        setIsDetailsModalOpen(true);
                        
                        // Update status when DO/HHRMD views complaint details
                        if ((user?.role === 'DO' || user?.role === 'HHRMD') && 
                            complaint.status === 'Submitted') {
                          
                          // Optimistic update
                          setComplaints(prev => 
                            prev.map(c => 
                              c.id === complaint.id 
                                ? { ...c, status: 'lalamiko lako limepokelewa, linafanyiwa kazi' }
                                : c
                            )
                          );
                          
                          try {
                            const response = await fetch(`/api/complaints/${complaint.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                status: 'lalamiko lako limepokelewa, linafanyiwa kazi'
                              })
                            });
                            
                            if (!response.ok) {
                              // Revert optimistic update on failure
                              setComplaints(prev => 
                                prev.map(c => 
                                  c.id === complaint.id 
                                    ? { ...c, status: 'Submitted' }
                                    : c
                                )
                              );
                            }
                          } catch (error) {
                            console.error('Error updating complaint status:', error);
                            // Revert optimistic update on error
                            setComplaints(prev => 
                              prev.map(c => 
                                c.id === complaint.id 
                                  ? { ...c, status: 'Submitted' }
                                  : c
                              )
                            );
                          }
                        }
                      }}>
                        <Eye className="mr-2 h-4 w-4"/>Tazama Maelezo Kamili
                    </Button>
                    {complaint.reviewStage === 'initial' && (complaint.status === "Submitted" || complaint.status === "Under Review" || complaint.status === "Under Review - Additional Information Provided" || complaint.status === "lalamiko lako limepokelewa, linafanyiwa kazi") && (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => handleInitialAction(complaint.id, 'reject_initial')}>Kataa Lalamiko</Button>
                        <Button size="sm" variant="secondary" onClick={() => openActionModal(complaint, "request_info")}>
                            <Info className="mr-2 h-4 w-4"/>Omba Maelezo Zaidi
                        </Button>
                         <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openActionModal(complaint, "resolve")}>
                            <CheckCircle className="mr-2 h-4 w-4"/>Weka Kama Imetatuliwa (Moja kwa Moja)
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openCommissionDecisionModal(complaint)}>
                            <FileText className="mr-2 h-4 w-4"/>Weka Maamuzi ya Tume
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Hakuna malalamiko yanayosubiri ukaguzi wako kwa sasa.</p>
            )}
          </CardContent>
        </Card>

        {/* Completed Complaints History Section */}
        {completedComplaints.length > 0 && (
          <Card className="shadow-lg mb-8">
            <CardHeader>
              <CardTitle>Historia ya Malalamiko Yaliyokamilika</CardTitle>
              <CardDescription>Malalamiko yaliyopitia na kukamilika - historia yako ya kazi iliyofanyika.</CardDescription>
            </CardHeader>
            <CardContent>
              {completedComplaints.map((complaint) => (
                <div key={complaint.id} className="mb-4 border p-4 rounded-md space-y-2 shadow-sm bg-secondary/20 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-base">{complaint.subject} (Type: {complaint.complaintType})</h3>
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        complaint.status === "Mtumishi ameridhika na hatua" ? "bg-green-100 text-green-700" :
                        complaint.status === "Closed - Satisfied" ? "bg-green-100 text-green-700" :
                        complaint.status.startsWith("Closed - Commission Decision") ? "bg-gray-100 text-gray-700" :
                        "bg-gray-100 text-gray-700"
                    }`}>{complaint.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From: {complaint.employeeName} {complaint.zanId ? `(ZanID: ${complaint.zanId})` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed: {format(parseISO(complaint.submissionDate), 'PPP')}</p>
                  <p className="text-sm mt-1"><strong>Details Preview:</strong> {complaint.details.substring(0, 150)}{complaint.details.length > 150 ? "..." : ""}</p>
                  
                  <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                        setSelectedComplaint(complaint);
                        setIsDetailsModalOpen(true);
                      }}>
                        <Eye className="mr-2 h-4 w-4"/>Tazama Historia Kamili
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        </>
      )}

      {selectedComplaint && isDetailsModalOpen && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Maelezo ya Lalamiko: {selectedComplaint.id}</DialogTitle>
              <DialogDescription>
                Kutoka: <strong>{selectedComplaint.employeeName}</strong> ({selectedComplaint.zanId || 'Hakijulikani'}) | Aina: {selectedComplaint.complaintType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
              <div><strong className="text-muted-foreground">Kichwa:</strong> <p className="mt-1">{selectedComplaint.subject}</p></div>
              <div><strong className="text-muted-foreground">Maelezo Kamili:</strong> <p className="mt-1 whitespace-pre-wrap">{selectedComplaint.details}</p></div>
              <div><strong className="text-muted-foreground">Iliwasilishwa Mnamo:</strong> {format(parseISO(selectedComplaint.submissionDate), 'PPP p')}</div>
              <div><strong className="text-muted-foreground">Hali:</strong> <span className="text-primary">{selectedComplaint.status}</span></div>
              
              {(role === ROLES.DO || role === ROLES.HHRMD) && (
                <Card className="mt-3 bg-blue-50 border-blue-200">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base text-blue-700">Maelezo ya Mawasiliano (Siri)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1 pb-3">
                    <p><strong>Simu ya Mlalamikaji:</strong> {selectedComplaint.complainantPhoneNumber || 'Haijatolewa'}</p>
                    <p><strong>Simu ya Mlezi:</strong> {selectedComplaint.nextOfKinPhoneNumber || 'Haijatolewa'}</p>
                  </CardContent>
                </Card>
              )}

              {selectedComplaint.zanId && (
                <Card className="mt-3 bg-secondary/20">
                    <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-base">Maelezo ya Mfanyakazi</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1 pb-3">
                        <p><strong>Idara:</strong> {selectedComplaint.department || 'Hakijulikani'}</p>
                        <p><strong>Cheo/Nafasi:</strong> {selectedComplaint.cadre || 'Hakijulikani'}</p>
                    </CardContent>
                </Card>
              )}

               <div className="pt-3 mt-3 border-t">
                    <Label className="font-semibold">Nyaraka Zilizofungwa</Label>
                    <div className="mt-2 space-y-2">
                    {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 ? (
                        selectedComplaint.attachments.map((objectKey, index) => {
                          const fileName = objectKey.split('/').pop() || objectKey;
                          return (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-secondary/50 text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground truncate" title={fileName}>{fileName}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewFile(objectKey)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    variant="ghost"
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
                                          a.download = fileName;
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
                        <p className="text-muted-foreground text-sm">Hakuna nyaraka zilizofungwa kwenye ombi hili.</p>
                    )}
                    </div>
                </div>

               {selectedComplaint.officerComments && (
                <div className="mt-2 pt-2 border-t">
                  <strong className="text-muted-foreground">Maoni/Mrejesho wa Afisa:</strong>
                  <p className="mt-1 whitespace-pre-wrap">{selectedComplaint.officerComments}</p>
                </div>
              )}
              {selectedComplaint.rejectionReason && (
                <div className="mt-2 pt-2 border-t">
                  <strong className="text-muted-foreground text-destructive">Sababu ya Kukataliwa:</strong>
                  <p className="mt-1 whitespace-pre-wrap text-destructive">{selectedComplaint.rejectionReason}</p>
                </div>
              )}
              {selectedComplaint.internalNotes && (
                <div className="mt-2 pt-2 border-t">
                  <strong className="text-muted-foreground">Maelezo ya Ndani:</strong>
                  <p className="mt-1 whitespace-pre-wrap bg-yellow-50 p-2 rounded border border-yellow-200">{selectedComplaint.internalNotes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Funga</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

       {selectedComplaint && isActionModalOpen && (actionType === 'resolve' || actionType === 'request_info') && (
        <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {actionType === 'resolve' && "Tatua Lalamiko Moja kwa Moja"}
                        {actionType === 'request_info' && "Omba Maelezo Zaidi"}
                        : {selectedComplaint.id}
                    </DialogTitle>
                    <DialogDescription>
                        Kwa lalamiko la <strong>{selectedComplaint.employeeName}</strong>. 
                        {actionType === 'request_info' ? " Bainisha maelezo ya ziada yanayohitajika kutoka kwa mfanyakazi." : " Toa maoni yako/sababu ya hatua hii."}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="officerActionCommentLegacy">
                            {actionType === 'request_info' ? "Maelezo/Ufafanuzi Unaohitajika kutoka kwa Mfanyakazi:" : "Maoni ya Afisa / Sababu ya Hatua:"}
                        </Label>
                        <Textarea
                            id="officerActionCommentLegacy"
                            placeholder="Ingiza maoni yako hapa..."
                            value={officerActionComment}
                            onChange={(e) => setOfficerActionComment(e.target.value)}
                            rows={5}
                            className="mt-1"
                        />
                    </div>
                     <div>
                        <Label htmlFor="officerInternalNoteLegacy">Maelezo ya Ndani (Si Lazima, kwa uwekaji kumbukumbu)</Label>
                        <Textarea
                            id="officerInternalNoteLegacy"
                            placeholder="Ongeza maelezo yoyote ya ndani hapa..."
                            value={officerInternalNote}
                            onChange={(e) => setOfficerInternalNote(e.target.value)}
                            rows={3}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <FileUpload
                          label="Funga Hati ya Majibu Rasmi (Si Lazima)"
                          description="Pakia hati ya majibu rasmi kwa muundo wa PDF"
                          value={officerAttachmentFile}
                          onChange={(objectKey) => setOfficerAttachmentFile(objectKey as string)}
                          folder="complaints/officer-responses"
                          maxSize={1.2}
                          accept=".pdf"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsActionModalOpen(false); setSelectedComplaint(null); setOfficerAttachmentFile(''); setActionType(null); }}>Ghairi</Button>
                    <Button 
                        onClick={handleOfficerSubmitLegacyAction} 
                        disabled={!officerActionComment.trim()}
                        className={
                            actionType === 'resolve' ? "bg-green-600 hover:bg-green-700 text-white" :
                            "" 
                        }
                    >
                        {actionType === 'resolve' && <><CheckCircle className="mr-2 h-4 w-4"/>Thibitisha Utatuzi</>}
                        {actionType === 'request_info' && <><MessageSquarePlus className="mr-2 h-4 w-4"/>Tuma Ombi la Maelezo</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {currentRequestToAction && isRejectionModalOpen && (
        <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Kataa Lalamiko: {currentRequestToAction.id}</DialogTitle>
                    <DialogDescription>
                        Tafadhali toa sababu ya kukataa lalamiko la <strong>{currentRequestToAction.employeeName}</strong>. Sababu hii itaonekana.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="Ingiza sababu ya kukataa hapa..."
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsRejectionModalOpen(false); setCurrentRequestToAction(null); setRejectionReasonInput(''); }}>Ghairi</Button>
                    <Button variant="destructive" onClick={handleRejectionSubmit} disabled={!rejectionReasonInput.trim()}>Wasilisha Ukataliaji</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {/* Employee Provide Additional Information Modal */}
      {selectedComplaintForInfo && isProvideInfoModalOpen && (
        <Dialog open={isProvideInfoModalOpen} onOpenChange={setIsProvideInfoModalOpen}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Toa Maelezo ya Ziada</DialogTitle>
              <DialogDescription>
                Kwa lalamiko: <strong>{selectedComplaintForInfo.subject}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {selectedComplaintForInfo.officerComments && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <Label className="text-sm font-medium text-amber-800">Ombi la Afisa:</Label>
                  <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">{selectedComplaintForInfo.officerComments}</p>
                </div>
              )}
              <div>
                <Label htmlFor="additionalInfo">Maelezo Yako ya Ziada:</Label>
                <Textarea
                  id="additionalInfo"
                  placeholder="Tafadhali toa maelezo ya ziada yaliyoombwa na afisa mkaguzi..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsProvideInfoModalOpen(false);
                setSelectedComplaintForInfo(null);
                setAdditionalInfo('');
              }}>Ghairi</Button>
              <Button 
                onClick={handleProvideAdditionalInfo} 
                disabled={!additionalInfo.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="mr-2 h-4 w-4"/>
                Wasilisha Maelezo ya Ziada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Employee Resubmission Modal */}
      {isResubmissionModalOpen && selectedComplaintForResubmission && (
        <Dialog open={isResubmissionModalOpen} onOpenChange={setIsResubmissionModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rekebisha na Wasilisha Upya Lalamiko</DialogTitle>
              <DialogDescription>
                Rekebisha lalamiko lako kufuatia maoni ya afisa na uweke upya. Tafadhali hakikisha kurekebisha makosa yote yaliyooneshwa katika sababu za kukataliwa.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedComplaintForResubmission.rejectionReason && (
                <Card className="bg-red-50 border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-700">Sababu ya Kukataliwa (Hapo awali):</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-600">{selectedComplaintForResubmission.rejectionReason}</p>
                  </CardContent>
                </Card>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleResubmitComplaint)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="complaintType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aina ya Lalamiko</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chagua aina ya lalamiko" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPLAINT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kichwa cha Lalamiko</FormLabel>
                        <FormControl>
                          <Input placeholder="Andika kichwa kifupi cha lalamiko lako" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complainantPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Namba ya Simu ya Mlalamikaji</FormLabel>
                        <FormControl>
                          <Input placeholder="0xxxxxxxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextOfKinPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Namba ya Simu ya Ndugu wa Karibu</FormLabel>
                        <FormControl>
                          <Input placeholder="0xxxxxxxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complaintText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maelezo ya Lalamiko (Yaliyo Rekebiswa)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Eleza lalamiko lako kwa undani. Hakikisha unatoa maarifa yote muhimu na kurekebisha makosa yote yaliyotajwa katika sababu za kukataliwa..." 
                            rows={6} 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsResubmissionModalOpen(false)}
                    >
                      Ghairi
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Inawasilisha...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Wasilisha Upya Lalamiko
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Commission Decision Modal */}
      {isCommissionDecisionModalOpen && selectedComplaintForCommissionDecision && (
        <Dialog open={isCommissionDecisionModalOpen} onOpenChange={setIsCommissionDecisionModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Weka Maamuzi ya Tume</DialogTitle>
              <DialogDescription>
                Weka maamuzi wa mwisho wa Tume ya Utumishi kuhusu lalamiko hili. Baada ya kuweka maamuzi, lalamiko litafungwa rasmi na hakutakuwa na uwezekano wa kuliwasilisha upya.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Onyo:</strong> Maamuzi haya ni ya mwisho na hayana kurudi nyuma. Lalamiko litafungwa kabisa.
                  </p>
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="decisionType">Aina ya Uamuzi</Label>
                <Select value={commissionDecisionType} onValueChange={(value: 'resolved' | 'rejected') => setCommissionDecisionType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Lalamiko Limetatuliwa</SelectItem>
                    <SelectItem value="rejected">Lalamiko Limekataliwa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="commissionDecision">Maamuzi ya Tume</Label>
                <Textarea
                  id="commissionDecision"
                  placeholder="Andika maamuzi ya tume kwa undani..."
                  value={commissionDecision}
                  onChange={(e) => setCommissionDecision(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {commissionDecisionType === 'resolved' && (
                <div>
                  <Label htmlFor="commissionLetter">
                    Barua ya Tume <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="commissionLetter"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setCommissionLetter(file || null);
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Chagua barua rasmi ya tume inayoonyesha maamuzi. PDF, Word, au picha zinazokubaliwa.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCommissionDecisionModalOpen(false)}>
                Ghairi
              </Button>
              <Button 
                onClick={handleCommissionDecision}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    Inaweka Maamuzi...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4"/>
                    Weka Maamuzi ya Mwisho
                  </>
                )}
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

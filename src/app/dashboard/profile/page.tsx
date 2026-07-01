'use client';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { ROLES } from '@/lib/constants';
import type { Employee, EmployeeCertificate } from '@/lib/types';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Search,
  FileText,
  UserCircle,
  Briefcase,
  Award,
  ArrowLeft,
  SlidersHorizontal,
  X,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DocumentUpload } from '@/components/employee/document-upload';
import { CertificateUpload } from '@/components/employee/certificate-upload';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'next/navigation';
import { clientLogger } from '@/lib/logger-client';
const log = clientLogger.child({ component: 'profile' });

// Standard certificate types to display for upload
const STANDARD_CERTIFICATE_TYPES = [
  'Certificate of Secondary education (Form IV)',
  'Advanced Certificate of Secondary education (Form VII)',
  'Certificate',
  'Diploma',
  'Advanced Diploma',
  'Bachelor Degree',
  'Master Degree',
  'PHd',
];

// Helper function to get initials for avatar
const getInitials = (name?: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

async function getEmployeesList() {
  const url = '/api/external/employees';

  const payload = {
    RequestId: '203',
    RequestPayloadData: {
      // PageNumber: 0,
      // PageSize: 100
      RequestBody: '536151',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

async function loadExternalEmployees() {
  try {
    const data = await getEmployeesList();
    log.info({ data }, 'External Employees API Response:');
  } catch (error) {
    log.error({ err: error }, 'Error fetching employees:');
  }
}

// Helper function to get status color
const getStatusColor = (status?: string | null) => {
  switch (status) {
    case 'Confirmed':
      return 'text-green-600';
    case 'On Probation':
      return 'text-yellow-600';
    case 'Retired':
      return 'text-blue-600';
    case 'Resigned':
      return 'text-gray-600';
    case 'Dismissed':
      return 'text-red-600';
    case 'Terminated':
      return 'text-red-700';
    case 'On LWOP':
      return 'text-purple-600';
    default:
      return 'text-gray-500';
  }
};

// Removed predefined certificate order - we now display all certificates
// from HRIMS with their original names, including duplicates with numeric suffixes

// Component to render the detailed profile view
const EmployeeDetailsCard = ({
  emp,
  onBack,
  userRole,
  userInstitutionId,
}: {
  emp: Employee;
  onBack: () => void;
  userRole?: string;
  userInstitutionId?: string;
}) => {
  const [documentUrls, setDocumentUrls] = useState({
    'ardhil-hali': emp.ardhilHaliUrl,
    'confirmation-letter': emp.confirmationLetterUrl,
    'job-contract': emp.jobContractUrl,
    'birth-certificate': emp.birthCertificateUrl,
  });

  const [certificates, setCertificates] = useState(emp.certificates || []);
  const [profileImageUrl, setProfileImageUrl] = useState(emp.profileImageUrl);
  const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);
  const [isFetchingDocuments, setIsFetchingDocuments] = useState(false);

  // Email editing state for EMPLOYEE role
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState((emp as any).email || '');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);

  // Sync state with emp prop when it changes (e.g., after data refresh)
  useEffect(() => {
    setDocumentUrls({
      'ardhil-hali': emp.ardhilHaliUrl,
      'confirmation-letter': emp.confirmationLetterUrl,
      'job-contract': emp.jobContractUrl,
      'birth-certificate': emp.birthCertificateUrl,
    });
    setCertificates(emp.certificates || []);
    setProfileImageUrl(emp.profileImageUrl);
  }, [
    emp.id,
    emp.ardhilHaliUrl,
    emp.confirmationLetterUrl,
    emp.jobContractUrl,
    emp.birthCertificateUrl,
    emp.certificates,
    emp.profileImageUrl,
  ]);

  // Check if user can upload documents (HRO or CSC roles)
  const canUploadDocuments =
    userRole &&
    ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN'].includes(userRole);

  // Auto-fetch photo from HRIMS if not already stored
  useEffect(() => {
    const fetchPhotoFromHRIMS = async () => {
      // Only fetch if:
      // 1. Photo is missing, OR
      // 2. Photo doesn't start with "data:image" (base64) or "/api/files/employee-photos/" (MinIO)
      // 3. Employee has a payroll number
      // 4. Employee is NOT manually entered (dataSource !== 'MANUAL_ENTRY')
      const hasExistingPhoto =
        profileImageUrl &&
        (profileImageUrl.startsWith('data:image') ||
          profileImageUrl.startsWith('/api/files/employee-photos/'));

      const isManuallyEntered = (emp as any).dataSource === 'MANUAL_ENTRY';

      if (!hasExistingPhoto && emp.payrollNumber && !isFetchingPhoto && !isManuallyEntered) {
        setIsFetchingPhoto(true);

        try {
          log.info(`Fetching photo from HRIMS for employee ${emp.name}...`);

          const response = await fetch(`/api/employees/${emp.id}/fetch-photo`, {
            method: 'POST',
          });

          const result = await response.json();

          if (result.success && result.data.photoUrl) {
            setProfileImageUrl(result.data.photoUrl);

            // Show success toast only if photo was newly fetched
            if (!result.data.alreadyExists) {
              toast({
                title: 'Photo Updated',
                description: `Profile photo fetched from HRIMS successfully`,
              });
            }
          } else if (response.status === 404) {
            log.info('No photo available in HRIMS for this employee');
          } else {
            log.error({ message: result.message }, 'Failed to fetch photo');
          }
        } catch (error) {
          log.error({ err: error }, 'Error fetching photo from HRIMS:');
        } finally {
          setIsFetchingPhoto(false);
        }
      }
    };

    fetchPhotoFromHRIMS();
  }, [emp.id, emp.payrollNumber, profileImageUrl]); // Removed isFetchingPhoto to prevent infinite loop

  // Auto-fetch documents from HRIMS if not already stored
  useEffect(() => {
    const fetchDocumentsFromHRIMS = async () => {
      // Only fetch if:
      // 1. Any document is missing or not from MinIO
      // 2. Employee has a payroll number
      // 3. Employee is NOT manually entered (dataSource !== 'MANUAL_ENTRY')
      const hasAllDocuments =
        documentUrls['ardhil-hali']?.startsWith(
          '/api/files/employee-documents/'
        ) &&
        documentUrls['confirmation-letter']?.startsWith(
          '/api/files/employee-documents/'
        ) &&
        documentUrls['job-contract']?.startsWith(
          '/api/files/employee-documents/'
        ) &&
        documentUrls['birth-certificate']?.startsWith(
          '/api/files/employee-documents/'
        );

      const isManuallyEntered = (emp as any).dataSource === 'MANUAL_ENTRY';

      if (!hasAllDocuments && emp.payrollNumber && !isFetchingDocuments && !isManuallyEntered) {
        setIsFetchingDocuments(true);

        try {
          log.info(`Fetching documents from HRIMS for employee ${emp.name}...`);

          const response = await fetch(
            `/api/employees/${emp.id}/fetch-documents`,
            {
              method: 'POST',
            }
          );

          const result = await response.json();

          if (result.success && result.data) {
            // Update document URLs with fetched documents
            if (result.data.documentsStored) {
              setDocumentUrls((prev) => ({
                ...prev,
                ...{
                  'ardhil-hali':
                    result.data.documentsStored.ardhilHali ||
                    prev['ardhil-hali'],
                  'confirmation-letter':
                    result.data.documentsStored.confirmationLetter ||
                    prev['confirmation-letter'],
                  'job-contract':
                    result.data.documentsStored.jobContract ||
                    prev['job-contract'],
                  'birth-certificate':
                    result.data.documentsStored.birthCertificate ||
                    prev['birth-certificate'],
                },
              }));
            }

            // Update certificates if any were fetched
            if (
              result.data.certificatesStored &&
              result.data.certificatesStored.length > 0
            ) {
              setCertificates((prev) => {
                // Add all new certificates from HRIMS without replacing existing ones
                // Each certificate has a unique type (including numeric suffixes for duplicates)
                const newCerts = [...prev];
                result.data.certificatesStored.forEach((newCert: any) => {
                  // Check if this exact certificate (by ID) already exists
                  const existingIndex = newCerts.findIndex(
                    (c) => c.id === newCert.id
                  );
                  if (existingIndex >= 0) {
                    // Update existing certificate
                    newCerts[existingIndex] = newCert;
                  } else {
                    // Add new certificate
                    newCerts.push(newCert);
                  }
                });
                return newCerts;
              });
            }

            if (result.data.totalProcessed > 0) {
              toast({
                title: 'Documents Updated',
                description: `${result.data.totalProcessed} document(s) fetched from HRIMS successfully`,
              });
            }
          } else if (response.status === 404) {
            log.info('No documents available in HRIMS for this employee');
          } else {
            log.error({ message: result.message }, 'Failed to fetch documents');
          }
        } catch (error) {
          log.error({ err: error }, 'Error fetching documents from HRIMS:');
        } finally {
          setIsFetchingDocuments(false);
        }
      }
    };

    fetchDocumentsFromHRIMS();
  }, [emp.id, emp.payrollNumber]); // Only trigger when employee changes

  const handleDocumentUploadSuccess = (
    documentType: string,
    documentUrl: string
  ) => {
    setDocumentUrls((prev) => ({
      ...prev,
      [documentType]: documentUrl,
    }));
  };

  const handleCertificateUploadSuccess = (certificate: any) => {
    setCertificates((prev) => {
      // Check if this exact certificate (by ID) already exists
      const existingIndex = prev.findIndex(
        (cert) => cert.id === certificate.id
      );
      if (existingIndex >= 0) {
        // Update existing certificate
        const updated = [...prev];
        updated[existingIndex] = certificate;
        return updated;
      } else {
        // Add new certificate
        return [...prev, certificate];
      }
    });
  };

  const handleCertificateDeleteSuccess = (certificateType: string) => {
    setCertificates((prev) =>
      prev.filter((cert) => cert.type !== certificateType)
    );
  };

  const handleEmailUpdate = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase();

    // Client-side validation
    if (!trimmedEmail) {
      setEmailError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate domain (.go.tz or .ac.tz only)
    const allowedDomains = ['.go.tz', '.ac.tz'];
    const hasValidDomain = allowedDomains.some(domain => trimmedEmail.endsWith(domain));
    if (!hasValidDomain) {
      setEmailError('Email must end with .go.tz or .ac.tz (government or academic domain only)');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailError('');

    try {
      const response = await fetch(`/api/employees/email?employeeId=${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setEmailError(result.message || 'Failed to update email');
        setIsUpdatingEmail(false);
        return;
      }

      // Update the emp object by triggering a re-render
      (emp as any).email = trimmedEmail;
      setEmailInput(trimmedEmail);
      setIsEmailModalOpen(false);

      // Refresh auth store so complaints page sees the updated email
      useAuthStore.getState().refreshUserData();

      toast({
        title: 'Email Updated',
        description: 'Your email address has been saved successfully. You can now submit complaints with MFA verification.',
      });
    } catch (error) {
      log.error({ err: error }, 'Email update error');
      setEmailError('An error occurred while updating your email. Please try again.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="border-b pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to list</span>
          </Button>
          <div className="flex-grow text-center pr-8">
            <div className="relative inline-block">
              <Avatar className="h-24 w-24 mb-4 shadow-md mx-auto">
                <AvatarImage
                  src={profileImageUrl || undefined}
                  alt={emp.name}
                />
                <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
              </Avatar>
              {isFetchingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-headline">{emp.name}</CardTitle>
            <CardDescription>
              ZanID: {emp.zanId} | Status:{' '}
              <span className={`font-semibold ${getStatusColor(emp.status)}`}>
                {emp.status || 'N/A'}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        <section>
          <div className="flex items-center mb-4">
            <UserCircle className="h-6 w-6 mr-3 text-primary" />
            <h3 className="text-xl font-semibold font-headline text-foreground">
              Personal Information
            </h3>
          </div>
          <Card className="bg-secondary/20 shadow-sm">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Full Name:</Label>
                <p className="font-medium text-foreground">{emp.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gender:</Label>
                <p className="font-medium text-foreground">{emp.gender}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ZanID:</Label>
                <p className="font-medium text-foreground">{emp.zanId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth:</Label>
                <p className="font-medium text-foreground">
                  {emp.dateOfBirth
                    ? new Date(emp.dateOfBirth).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Place of Birth:</Label>
                <p className="font-medium text-foreground">
                  {emp.placeOfBirth || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Region:</Label>
                <p className="font-medium text-foreground">
                  {emp.region || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Country of Birth:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.countryOfBirth || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone Number:</Label>
                <p className="font-medium text-foreground">
                  {emp.phoneNumber || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email Address:</Label>
                {(emp as any).email ? (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{(emp as any).email}</p>
                    {userRole === 'EMPLOYEE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setEmailInput((emp as any).email || '');
                          setIsEmailModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-amber-600 italic">Not provided - required for MFA complaints</p>
                    {userRole === 'EMPLOYEE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs border-amber-400 text-amber-600 hover:bg-amber-50"
                        onClick={() => {
                          setEmailInput('');
                          setIsEmailModalOpen(true);
                        }}
                      >
                        Add Email
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Contact Address:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.contactAddress || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">ZSSF Number:</Label>
                <p className="font-medium text-foreground">
                  {emp.zssfNumber || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payroll Number:</Label>
                <p className="font-medium text-foreground">
                  {emp.payrollNumber || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
        <section>
          <div className="flex items-center mb-4">
            <Briefcase className="h-6 w-6 mr-3 text-primary" />
            <h3 className="text-xl font-semibold font-headline text-foreground">
              Employment Summary
            </h3>
          </div>
          <Card className="bg-secondary/20 shadow-sm">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Rank (Cadre):</Label>
                <p className="font-medium text-foreground">
                  {emp.cadre || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Salary Scale:</Label>
                <p className="font-medium text-foreground">
                  {emp.salaryScale || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Ministry:</Label>
                <p className="font-medium text-foreground">
                  {emp.ministry || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Institution:</Label>
                <p className="font-medium text-foreground">
                  {emp.institution && typeof emp.institution === 'object'
                    ? emp.institution.name
                    : emp.institution || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Department:</Label>
                <p className="font-medium text-foreground">
                  {emp.department || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Appointment Type:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.appointmentType || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Contract Type:</Label>
                <p className="font-medium text-foreground">
                  {emp.contractType || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Recent Title Date:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.recentTitleDate
                    ? new Date(emp.recentTitleDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Current Reporting Office:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.currentReportingOffice || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Current Workplace:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.currentWorkplace || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Employment Date:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.employmentDate
                    ? new Date(emp.employmentDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Confirmation Date:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.confirmationDate
                    ? new Date(emp.confirmationDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Retirement Date:
                </Label>
                <p className="font-medium text-foreground">
                  {emp.retirementDate
                    ? new Date(emp.retirementDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
        <section>
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 mr-3 text-primary" />
            <h3 className="text-xl font-semibold font-headline text-foreground">
              Employee Documents
            </h3>
            {isFetchingDocuments && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Fetching documents from HRIMS...</span>
              </div>
            )}
          </div>
          <Card className="bg-secondary/20 shadow-sm mb-6">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base">Core Documents</CardTitle>
              {canUploadDocuments && (
                <p className="text-sm text-muted-foreground">
                  You can upload and manage employee documents. Only PDF files
                  up to 5MB are allowed.
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 pb-4 space-y-3">
              <DocumentUpload
                employeeId={emp.id}
                documentType="ardhil-hali"
                documentTitle="Ardhil-hali"
                currentUrl={documentUrls['ardhil-hali'] || undefined}
                canUpload={canUploadDocuments || false}
                userRole={userRole}
                userInstitutionId={userInstitutionId}
                onUploadSuccess={(url) =>
                  handleDocumentUploadSuccess('ardhil-hali', url)
                }
              />
              <DocumentUpload
                employeeId={emp.id}
                documentType="confirmation-letter"
                documentTitle="Confirmation Letter"
                currentUrl={documentUrls['confirmation-letter'] || undefined}
                canUpload={canUploadDocuments || false}
                userRole={userRole}
                userInstitutionId={userInstitutionId}
                onUploadSuccess={(url) =>
                  handleDocumentUploadSuccess('confirmation-letter', url)
                }
              />
              <DocumentUpload
                employeeId={emp.id}
                documentType="job-contract"
                documentTitle="Job Contract"
                currentUrl={documentUrls['job-contract'] || undefined}
                canUpload={canUploadDocuments || false}
                userRole={userRole}
                userInstitutionId={userInstitutionId}
                onUploadSuccess={(url) =>
                  handleDocumentUploadSuccess('job-contract', url)
                }
              />
              <DocumentUpload
                employeeId={emp.id}
                documentType="birth-certificate"
                documentTitle="Birth Certificate"
                currentUrl={documentUrls['birth-certificate'] || undefined}
                canUpload={canUploadDocuments || false}
                userRole={userRole}
                userInstitutionId={userInstitutionId}
                onUploadSuccess={(url) =>
                  handleDocumentUploadSuccess('birth-certificate', url)
                }
              />
            </CardContent>
          </Card>
          <Card className="bg-secondary/20 shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-base">
                  Employee Certificates
                </CardTitle>
              </div>
              {canUploadDocuments && (
                <p className="text-sm text-muted-foreground">
                  You can upload and manage employee certificates. Only PDF
                  files up to 1MB are allowed.
                  {userRole === 'HRO' && (
                    <span className="block mt-1 text-xs text-amber-600">
                      Note: HRO can only upload certificates for manually entered employees.
                    </span>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 pb-4 space-y-3">
              {/* Display all standard certificate types with upload capability */}
              {(() => {
                // Check if employee is manually entered
                const isManuallyEntered = (emp as any).dataSource === 'MANUAL_ENTRY';

                // For HRO, only show upload if employee is manually entered
                const canUploadForThisEmployee = canUploadDocuments &&
                  (userRole !== 'HRO' || isManuallyEntered);

                return STANDARD_CERTIFICATE_TYPES.map((certType) => {
                  // Find existing certificate of this type
                  const existingCert = certificates?.find(
                    (cert) => cert.type === certType
                  );

                  return (
                    <CertificateUpload
                      key={certType}
                      employeeId={emp.id}
                      certificateType={certType}
                      certificateTitle={certType}
                      currentCertificate={existingCert}
                      canUpload={canUploadForThisEmployee || false}
                      userRole={userRole}
                      userInstitutionId={userInstitutionId}
                      onUploadSuccess={handleCertificateUploadSuccess}
                      onDeleteSuccess={handleCertificateDeleteSuccess}
                    />
                  );
                });
              })()}
            </CardContent>
          </Card>
        </section>
      </CardContent>

      {/* Email Update Modal for EMPLOYEE role */}
      {userRole === 'EMPLOYEE' && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Email Address</DialogTitle>
              <DialogDescription>
                Enter your government or academic email address. This email will be used for MFA verification when submitting complaints.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employeeEmail">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="employeeEmail"
                  type="email"
                  placeholder="yourname@ministry.go.tz"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError('');
                  }}
                  onBlur={async () => {
                    const val = emailInput.trim().toLowerCase();
                    if (!val || val === (emp as any).email?.toLowerCase()) return;
                    const allowedDomains = ['.go.tz', '.ac.tz'];
                    if (!allowedDomains.some(d => val.endsWith(d))) return;
                    setEmailChecking(true);
                    try {
                      const res = await fetch(`/api/employees/email/check?email=${encodeURIComponent(val)}`);
                      const data = await res.json();
                      if (data.inUse) {
                        setEmailError('This email address is already in use by another employee');
                      }
                    } catch { /* ignore */ }
                    setEmailChecking(false);
                  }}
                  disabled={isUpdatingEmail}
                  className={emailError ? 'border-red-500' : ''}
                />
                {emailChecking && (
                  <p className="text-sm text-muted-foreground">Checking email availability...</p>
                )}
                {emailError && (
                  <p className="text-sm text-red-500">{emailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Must end with <strong>.go.tz</strong> (government) or <strong>.ac.tz</strong> (academic)
                </p>
              </div>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Why do I need an email?</strong><br />
                    Your email is required for MFA (Multi-Factor Authentication) when submitting complaints. This ensures secure verification of your identity.
                  </p>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} disabled={isUpdatingEmail}>
                Cancel
              </Button>
              <Button onClick={handleEmailUpdate} disabled={isUpdatingEmail}>
                {isUpdatingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Email'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

interface InstitutionOption {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get('employeeId');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [cadreFilter, setCadreFilter] = useState('');
  const [workplaceFilter, setWorkplaceFilter] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isCommissionUser = useMemo(
    () =>
      role === ROLES.HHRMD ||
      role === ROLES.HRMO ||
      role === ROLES.DO ||
      role === ROLES.CSCS ||
      role === ROLES.PO ||
      role === ROLES.ADMIN,
    [role]
  );

  const isInstitutionalViewer = useMemo(
    () => role === ROLES.HRO || role === ROLES.HRRP,
    [role]
  );

  // Load institutions list for CSC users
  useEffect(() => {
    if (isCommissionUser) {
      fetch('/api/institutions')
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setInstitutions(result.data);
          }
        })
        .catch(() => {});
    }
  }, [isCommissionUser]);

  const fetchEmployees = useCallback(
    async (
      query = '',
      status = '',
      gender = '',
      page = 1,
      advanced: { cadre?: string; currentWorkplace?: string; ministry?: string; department?: string; institutionId?: string } = {}
    ) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('q', query);
        params.append('page', page.toString());
        params.append('size', itemsPerPage.toString());
        loadExternalEmployees();

        if (status && status !== 'all') params.append('status', status);
        if (gender && gender !== 'all') params.append('gender', gender);
        if (advanced.cadre) params.append('cadre', advanced.cadre);
        if (advanced.currentWorkplace) params.append('currentWorkplace', advanced.currentWorkplace);
        if (advanced.ministry) params.append('ministry', advanced.ministry);
        if (advanced.department) params.append('department', advanced.department);
        if (advanced.institutionId && advanced.institutionId !== 'all') params.append('institutionId', advanced.institutionId);

        let url: string;
        if (isCommissionUser) {
          url = `/api/employees?${params.toString()}`;
        } else {
          params.append('userRole', role || '');
          params.append('userInstitutionId', user?.institutionId || '');
          url = `/api/employees?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch employees');
        const result = await response.json();

        setEmployees(result.data || []);

        if (result.pagination) {
          setTotalItems(result.pagination.total || 0);
          setTotalPages(result.pagination.totalPages || 1);
        } else {
          setTotalItems(result.data?.length || 0);
          setTotalPages(1);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load employee data.',
          variant: 'destructive',
        });
      } finally {
        setPageLoading(false);
      }
    },
    [role, user?.institutionId, isCommissionUser, itemsPerPage]
  );

  // Fetch specific employee if employeeId is provided in URL
  useEffect(() => {
    if (authLoading) return;
    if (!employeeIdParam) return;

    const fetchSpecificEmployee = async () => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams({
          id: employeeIdParam,
          userRole: role || '',
          userInstitutionId: user?.institutionId || '',
        });
        const response = await fetch(`/api/employees?${params.toString()}`);
        if (!response.ok) throw new Error('Could not load employee.');
        const result = await response.json();

        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('Employee not found');
        }

        setSelectedEmployee(result.data[0]);
      } catch (error) {
        toast({
          title: 'Employee Not Found',
          description: 'The requested employee profile could not be found.',
          variant: 'destructive',
        });
      } finally {
        setPageLoading(false);
      }
    };

    fetchSpecificEmployee();
  }, [employeeIdParam, authLoading, role, user?.institutionId]);

  useEffect(() => {
    if (authLoading) return;
    if (employeeIdParam) return;

    if (role === ROLES.EMPLOYEE && user?.employeeId) {
      const fetchOwnProfile = async () => {
        setPageLoading(true);
        try {
          const response = await fetch(
            `/api/employees/search?employeeId=${user.employeeId}&userRole=${user.role}&userInstitutionId=${user.institutionId}`
          );
          if (!response.ok) throw new Error('Could not load your profile.');
          const result = await response.json();

          if (!result.success || !result.data || result.data.length === 0) {
            throw new Error('Employee profile not found');
          }

          setSelectedEmployee(result.data[0]);
        } catch (error) {
          toast({
            title: 'Profile Not Found',
            description:
              'Your employee profile could not be loaded. Please contact HR.',
            variant: 'destructive',
          });
        } finally {
          setPageLoading(false);
        }
      };
      fetchOwnProfile();
    } else if (isInstitutionalViewer || isCommissionUser) {
      fetchEmployees();
    } else {
      setPageLoading(false);
    }
  }, [
    user,
    role,
    authLoading,
    isCommissionUser,
    isInstitutionalViewer,
    fetchEmployees,
    employeeIdParam,
  ]);

  // Debounced filter effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isInstitutionalViewer || isCommissionUser) {
        setCurrentPage(1);
        fetchEmployees(searchTerm, statusFilter, genderFilter, 1, {
          cadre: cadreFilter,
          currentWorkplace: workplaceFilter,
          ministry: ministryFilter,
          department: departmentFilter,
          institutionId: institutionFilter,
        });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [
    searchTerm,
    statusFilter,
    genderFilter,
    cadreFilter,
    workplaceFilter,
    ministryFilter,
    departmentFilter,
    institutionFilter,
    fetchEmployees,
    isInstitutionalViewer,
    isCommissionUser,
  ]);

  // Fetch new data when page changes
  useEffect(() => {
    if (currentPage > 1 && (isInstitutionalViewer || isCommissionUser)) {
      fetchEmployees(searchTerm, statusFilter, genderFilter, currentPage, {
        cadre: cadreFilter,
        currentWorkplace: workplaceFilter,
        ministry: ministryFilter,
        department: departmentFilter,
        institutionId: institutionFilter,
      });
    }
  }, [
    currentPage,
    searchTerm,
    statusFilter,
    genderFilter,
    cadreFilter,
    workplaceFilter,
    ministryFilter,
    departmentFilter,
    institutionFilter,
    fetchEmployees,
    isInstitutionalViewer,
    isCommissionUser,
  ]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== '' ||
      (statusFilter && statusFilter !== 'all') ||
      (genderFilter && genderFilter !== 'all') ||
      cadreFilter !== '' ||
      workplaceFilter !== '' ||
      ministryFilter !== '' ||
      departmentFilter !== '' ||
      (institutionFilter && institutionFilter !== 'all')
    );
  }, [searchTerm, statusFilter, genderFilter, cadreFilter, workplaceFilter, ministryFilter, departmentFilter, institutionFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter && statusFilter !== 'all') count++;
    if (genderFilter && genderFilter !== 'all') count++;
    if (cadreFilter) count++;
    if (workplaceFilter) count++;
    if (ministryFilter) count++;
    if (departmentFilter) count++;
    if (institutionFilter && institutionFilter !== 'all') count++;
    return count;
  }, [searchTerm, statusFilter, genderFilter, cadreFilter, workplaceFilter, ministryFilter, departmentFilter, institutionFilter]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setGenderFilter('all');
    setCadreFilter('');
    setWorkplaceFilter('');
    setMinistryFilter('');
    setDepartmentFilter('');
    setInstitutionFilter('all');
  };

  const removeFilter = (filterType: string) => {
    switch (filterType) {
      case 'search': setSearchTerm(''); break;
      case 'status': setStatusFilter('all'); break;
      case 'gender': setGenderFilter('all'); break;
      case 'cadre': setCadreFilter(''); break;
      case 'workplace': setWorkplaceFilter(''); break;
      case 'ministry': setMinistryFilter(''); break;
      case 'department': setDepartmentFilter(''); break;
      case 'institution': setInstitutionFilter('all'); break;
    }
  };

  const pageTitle = useMemo(() => {
    if (role === ROLES.EMPLOYEE) return 'My Profile';
    if (isInstitutionalViewer) {
      const instName = user?.institutionName ?? undefined;
      return `Employee Profiles - ${instName || 'Your Institution'}`;
    }
    return 'All Employee Profiles';
  }, [role, isInstitutionalViewer, user]);

  const pageDescription = useMemo(() => {
    if (role === ROLES.EMPLOYEE)
      return 'Your comprehensive employee information.';
    if (isInstitutionalViewer)
      return 'A list of all employees within your institution.';
    return 'Search and view profiles for all employees across all institutions.';
  }, [role, isInstitutionalViewer]);

  const paginatedEmployees = employees || [];

  if (authLoading || (pageLoading && !selectedEmployee)) {
    return (
      <div>
        <PageHeader title="Loading Profile..." />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedEmployee) {
    const onBack =
      role === ROLES.EMPLOYEE ? () => {} : () => setSelectedEmployee(null);
    return (
      <EmployeeDetailsCard
        emp={selectedEmployee}
        onBack={onBack}
        userRole={role || undefined}
        userInstitutionId={user?.institutionId || undefined}
      />
    );
  }

  return (
    <div>
      <PageHeader title={pageTitle} description={pageDescription} />

      {(isCommissionUser || isInstitutionalViewer) && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Search & Filter Employees</CardTitle>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeFilterCount} active
                  </Badge>
                )}
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                  Clear all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* General search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, ZAN-ID, payroll number, institution, or rank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Basic filters row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status-filter" className="text-xs text-muted-foreground">Employment Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="On Probation">On Probation</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Dismissed">Dismissed</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                    <SelectItem value="On LWOP">On LWOP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gender-filter" className="text-xs text-muted-foreground">Gender</Label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger id="gender-filter">
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Institution filter - only for CSC/commission users */}
              {isCommissionUser && institutions.length > 0 && (
                <div>
                  <Label htmlFor="institution-filter" className="text-xs text-muted-foreground">Institution</Label>
                  <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                    <SelectTrigger id="institution-filter">
                      <SelectValue placeholder="All institutions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All institutions</SelectItem>
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Advanced filters toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Advanced Filters
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Advanced filters section */}
            {showAdvanced && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cadre-filter" className="text-xs text-muted-foreground">Cadre / Rank</Label>
                    <Input
                      id="cadre-filter"
                      placeholder='e.g. "Utumishi", "Afisa"'
                      value={cadreFilter}
                      onChange={(e) => setCadreFilter(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="workplace-filter" className="text-xs text-muted-foreground">Current Workplace</Label>
                    <Input
                      id="workplace-filter"
                      placeholder='e.g. "Kusini Pemba", "Mjini Magharibi"'
                      value={workplaceFilter}
                      onChange={(e) => setWorkplaceFilter(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ministry-filter" className="text-xs text-muted-foreground">Ministry</Label>
                    <Input
                      id="ministry-filter"
                      placeholder='e.g. "Elimu", "Afya"'
                      value={ministryFilter}
                      onChange={(e) => setMinistryFilter(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="department-filter" className="text-xs text-muted-foreground">Department</Label>
                    <Input
                      id="department-filter"
                      placeholder='e.g. "Utumishi", "Fedha"'
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Advanced filters use partial matching (e.g. &quot;Utumishi&quot; matches &quot;Mfumo wa Utumishi&quot;). All filters are applied together.
                </p>
              </div>
            )}

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Search: {searchTerm}
                    <button onClick={() => removeFilter('search')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter && statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Status: {statusFilter}
                    <button onClick={() => removeFilter('status')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {genderFilter && genderFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Gender: {genderFilter}
                    <button onClick={() => removeFilter('gender')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {cadreFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Cadre: {cadreFilter}
                    <button onClick={() => removeFilter('cadre')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {workplaceFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Workplace: {workplaceFilter}
                    <button onClick={() => removeFilter('workplace')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {ministryFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Ministry: {ministryFilter}
                    <button onClick={() => removeFilter('ministry')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {departmentFilter && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Dept: {departmentFilter}
                    <button onClick={() => removeFilter('department')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {institutionFilter && institutionFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1 pr-1">
                    Institution: {institutions.find(i => i.id === institutionFilter)?.name || institutionFilter}
                    <button onClick={() => removeFilter('institution')} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(isCommissionUser || isInstitutionalViewer) && (
        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>
              {totalItems || 0} employee(s) found
              {hasActiveFilters && (
                <span className="text-muted-foreground">
                  {' '}
                  with active filters
                </span>
              )}
              . Showing page {currentPage} of {totalPages}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>
                A list of employees. Click a row to view full details.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>ZAN-ID</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Cadre</TableHead>
                  <TableHead>Workplace</TableHead>
                  <TableHead>Payroll Number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.gender}</TableCell>
                      <TableCell>{emp.zanId}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {emp.institution && typeof emp.institution === 'object'
                          ? emp.institution.name
                          : emp.institution || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{emp.cadre || 'N/A'}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{emp.currentWorkplace || 'N/A'}</TableCell>
                      <TableCell>{emp.payrollNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${getStatusColor(emp.status)}`}
                        >
                          {emp.status || 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No employees found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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

      {role === ROLES.EMPLOYEE && !selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your employee profile could not be loaded. Please contact HR.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

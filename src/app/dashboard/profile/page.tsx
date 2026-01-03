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
import { Pagination } from '@/components/shared/pagination';
import { useSearchParams } from 'next/navigation';

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
    console.log('External Employees API Response:', data);
  } catch (error) {
    console.error('Error fetching employees:', error);
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
      const hasExistingPhoto =
        profileImageUrl &&
        (profileImageUrl.startsWith('data:image') ||
          profileImageUrl.startsWith('/api/files/employee-photos/'));

      if (!hasExistingPhoto && emp.payrollNumber && !isFetchingPhoto) {
        setIsFetchingPhoto(true);

        try {
          console.log(`Fetching photo from HRIMS for employee ${emp.name}...`);

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
            console.log('No photo available in HRIMS for this employee');
          } else {
            console.error('Failed to fetch photo:', result.message);
          }
        } catch (error) {
          console.error('Error fetching photo from HRIMS:', error);
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

      if (!hasAllDocuments && emp.payrollNumber && !isFetchingDocuments) {
        setIsFetchingDocuments(true);

        try {
          console.log(
            `Fetching documents from HRIMS for employee ${emp.name}...`
          );

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
            console.log('No documents available in HRIMS for this employee');
          } else {
            console.error('Failed to fetch documents:', result.message);
          }
        } catch (error) {
          console.error('Error fetching documents from HRIMS:', error);
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
                  src={
                    profileImageUrl ||
                    `https://placehold.co/100x100.png?text=${getInitials(emp.name)}`
                  }
                  alt={emp.name}
                  data-ai-hint="employee photo"
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
                  files up to 5MB are allowed.
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0 pb-4 space-y-3">
              {/* Display all certificates with their original HRIMS names */}
              {certificates && certificates.length > 0 ? (
                certificates.map((cert) => (
                  <CertificateUpload
                    key={cert.id}
                    employeeId={emp.id}
                    certificateType={cert.type}
                    certificateTitle={cert.type}
                    currentCertificate={cert}
                    canUpload={canUploadDocuments || false}
                    userRole={userRole}
                    userInstitutionId={userInstitutionId}
                    onUploadSuccess={handleCertificateUploadSuccess}
                    onDeleteSuccess={handleCertificateDeleteSuccess}
                  />
                ))
              ) : (
                <div className="text-sm text-muted-foreground italic text-center py-4">
                  No certificates available.{' '}
                  {canUploadDocuments
                    ? 'Upload certificates or they will be automatically fetched from HRIMS if available.'
                    : 'Certificates will be automatically fetched from HRIMS if available.'}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </CardContent>
    </Card>
  );
};

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
  const [pageLoading, setPageLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Server-side pagination
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

  const fetchEmployees = useCallback(
    async (query = '', status = '', gender = '', page = 1) => {
      setPageLoading(true);
      try {
        // CSC internal roles and Admin should see ALL employees from all institutions
        // Institution-based roles should only see employees from their institution
        // Build query parameters with server-side pagination
        const params = new URLSearchParams();
        params.append('q', query);
        params.append('page', page.toString());
        params.append('size', itemsPerPage.toString());
        loadExternalEmployees();

        if (status && status !== 'all') params.append('status', status);
        if (gender && gender !== 'all') params.append('gender', gender);

        let url: string;
        if (isCommissionUser) {
          // CSC roles see all employees - don't filter by institution
          url = `/api/employees?${params.toString()}`;
        } else {
          // Institution-based roles see only their institution's employees
          params.append('userRole', role || '');
          params.append('userInstitutionId', user?.institutionId || '');
          url = `/api/employees?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch employees');
        const result = await response.json();

        setEmployees(result.data || []);

        // Update pagination info from server response
        if (result.pagination) {
          setTotalItems(result.pagination.total || 0);
          setTotalPages(result.pagination.totalPages || 1);
        } else {
          // Fallback if pagination info not provided
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
        // Fetch the specific employee by ID
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

        // The API returns the employee in an array
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
    if (employeeIdParam) return; // Skip if we're loading a specific employee

    if (role === ROLES.EMPLOYEE && user?.employeeId) {
      const fetchOwnProfile = async () => {
        setPageLoading(true);
        try {
          // Assuming an API endpoint exists to get a profile by employee ID
          const response = await fetch(
            `/api/employees/search?zanId=${user.zanId}&userRole=${user.role}&userInstitutionId=${user.institutionId}`
          ); // A bit of a hack, would be better to have a dedicated /api/profile
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isInstitutionalViewer || isCommissionUser) {
        setCurrentPage(1); // Reset to page 1 when filters change
        fetchEmployees(searchTerm, statusFilter, genderFilter, 1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [
    searchTerm,
    statusFilter,
    genderFilter,
    fetchEmployees,
    isInstitutionalViewer,
    isCommissionUser,
  ]);

  // Fetch new data when page changes
  useEffect(() => {
    if (currentPage > 1 && (isInstitutionalViewer || isCommissionUser)) {
      fetchEmployees(searchTerm, statusFilter, genderFilter, currentPage);
    }
  }, [
    currentPage,
    searchTerm,
    statusFilter,
    genderFilter,
    fetchEmployees,
    isInstitutionalViewer,
    isCommissionUser,
  ]);

  const pageTitle = useMemo(() => {
    if (role === ROLES.EMPLOYEE) return 'My Profile';
    if (isInstitutionalViewer) {
      const inst = user?.institution;
      const instName =
        typeof inst === 'object' && inst !== null
          ? inst.name
          : typeof inst === 'string'
            ? inst
            : undefined;
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

  // Server-side pagination - use employees directly from API
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
    // Employee role should not see the back button
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
            <CardTitle>Search & Filter Employees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, ZAN-ID, payroll number, institution, or rank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
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
                <Label htmlFor="gender-filter">Gender</Label>
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
            </div>

            {(searchTerm ||
              (statusFilter && statusFilter !== 'all') ||
              (genderFilter && genderFilter !== 'all')) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setGenderFilter('all');
                }}
                className="w-full md:w-auto"
              >
                Clear All Filters
              </Button>
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
              {(searchTerm ||
                (statusFilter && statusFilter !== 'all') ||
                (genderFilter && genderFilter !== 'all')) && (
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
                      <TableCell>
                        {emp.institution && typeof emp.institution === 'object'
                          ? emp.institution.name
                          : emp.institution || 'N/A'}
                      </TableCell>
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
                    <TableCell colSpan={6} className="text-center">
                      No employees found.
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

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DocumentUpload } from '@/components/employee/document-upload';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

interface DocumentsStepProps {
  employeeId: string;
  employeeName: string;
  onComplete?: () => void;
}

export function DocumentsStep({ employeeId, employeeName, onComplete }: DocumentsStepProps) {
  const router = useRouter();
  const { user, role } = useAuth();

  // Track each document's URL so the DocumentUpload cards reflect the
  // uploaded file immediately (the server stores it, but without this state
  // the card stays "Not Available" after a successful upload).
  const [documentUrls, setDocumentUrls] = useState<
    Record<string, string | null>
  >({
    'ardhil-hali': null,
    'confirmation-letter': null,
    'job-contract': null,
    'birth-certificate': null,
  });

  // Seed from the server in case the user re-enters this step for an employee
  // that already has documents stored (e.g. uploaded earlier then navigated
  // back). The POST upload route writes the URL to the employee row, and the
  // GET documents route reads those fields back.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get<{
          documents: Record<string, string | null>;
        }>(`/api/employees/${employeeId}/documents`);
        if (mounted && res.success && res.data?.documents) {
          setDocumentUrls(res.data.documents);
        }
      } catch {
        // Non-fatal: the cards simply stay "Not Available" until an upload.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [employeeId]);

  const handleDocumentUploadSuccess = (
    documentType: string,
    documentUrl: string
  ) => {
    setDocumentUrls((prev) => ({ ...prev, [documentType]: documentUrl }));
  };

  const handleViewProfile = () => {
    router.push(`/dashboard/profile?id=${employeeId}`);
  };

  const handleAddAnother = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/dashboard/add-employee?nocache=1');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Employee Created Successfully!
          </CardTitle>
          <CardDescription>
            {employeeName} has been added to the system. You can now upload documents or add them later.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Core Documents (Optional)</CardTitle>
          <CardDescription>
            Upload essential employee documents. You can also add these later from the employee profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUpload
            employeeId={employeeId}
            documentType="ardhil-hali"
            documentTitle="Ardhil Hali"
            currentUrl={documentUrls['ardhil-hali'] || undefined}
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
            onUploadSuccess={(url) =>
              handleDocumentUploadSuccess('ardhil-hali', url)
            }
          />
          <DocumentUpload
            employeeId={employeeId}
            documentType="confirmation-letter"
            documentTitle="Confirmation Letter"
            currentUrl={documentUrls['confirmation-letter'] || undefined}
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
            onUploadSuccess={(url) =>
              handleDocumentUploadSuccess('confirmation-letter', url)
            }
          />
          <DocumentUpload
            employeeId={employeeId}
            documentType="job-contract"
            documentTitle="Job Contract"
            currentUrl={documentUrls['job-contract'] || undefined}
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
            onUploadSuccess={(url) =>
              handleDocumentUploadSuccess('job-contract', url)
            }
          />
          <DocumentUpload
            employeeId={employeeId}
            documentType="birth-certificate"
            documentTitle="Birth Certificate"
            currentUrl={documentUrls['birth-certificate'] || undefined}
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
            onUploadSuccess={(url) =>
              handleDocumentUploadSuccess('birth-certificate', url)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Documents</CardTitle>
          <CardDescription>
            You can upload educational certificates and other documents from the employee profile page.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleAddAnother}>
          Add Another Employee
        </Button>
        <Button onClick={handleViewProfile}>
          View Employee Profile
        </Button>
      </div>
    </div>
  );
}

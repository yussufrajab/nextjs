'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DocumentUpload } from '@/components/employee/document-upload';
import { useAuth } from '@/hooks/use-auth';

interface DocumentsStepProps {
  employeeId: string;
  employeeName: string;
  onComplete?: () => void;
}

export function DocumentsStep({ employeeId, employeeName, onComplete }: DocumentsStepProps) {
  const router = useRouter();
  const { user, role } = useAuth();

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
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
          />
          <DocumentUpload
            employeeId={employeeId}
            documentType="confirmation-letter"
            documentTitle="Confirmation Letter"
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
          />
          <DocumentUpload
            employeeId={employeeId}
            documentType="job-contract"
            documentTitle="Job Contract"
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
          />
          <DocumentUpload
            employeeId={employeeId}
            documentType="birth-certificate"
            documentTitle="Birth Certificate"
            canUpload={true}
            userRole={role || undefined}
            userInstitutionId={user?.institutionId || undefined}
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

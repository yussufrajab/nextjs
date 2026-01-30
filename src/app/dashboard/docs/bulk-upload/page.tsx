'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, ArrowLeft, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BulkUploadDocsPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Bulk Employee Upload - User Guide"
        description="Complete guide for HROs to upload multiple employees using CSV files"
      />

      <div className="mb-6 flex flex-wrap gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" asChild>
          <a href="/templates/CSMS_Employee_Bulk_Upload_Template.csv" download>
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/BULK_EMPLOYEE_UPLOAD_GUIDE.pdf" download>
            <Download className="mr-2 h-4 w-4" />
            Download Guide (PDF)
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/BULK_EMPLOYEE_UPLOAD_GUIDE.pdf" target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open PDF in New Tab
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative w-full" style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
            <iframe
              src="/BULK_EMPLOYEE_UPLOAD_GUIDE.pdf"
              className="w-full h-full border-0"
              title="Bulk Employee Upload Guide"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-center text-sm text-gray-500">
        <p>
          If the PDF doesn't display properly,{' '}
          <a
            href="/BULK_EMPLOYEE_UPLOAD_GUIDE.pdf"
            download
            className="text-primary hover:underline"
          >
            click here to download it
          </a>
          .
        </p>
      </div>
    </div>
  );
}

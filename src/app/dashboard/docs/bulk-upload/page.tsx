'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BulkUploadDocsPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/BULK_EMPLOYEE_UPLOAD_GUIDE.md')
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading guide:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Bulk Upload Documentation" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500">Loading documentation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Bulk Employee Upload - User Guide"
        description="Complete guide for HROs to upload multiple employees using CSV files"
      />

      <div className="mb-6 flex gap-4">
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
          <a href="/BULK_EMPLOYEE_UPLOAD_GUIDE.md" download>
            <FileText className="mr-2 h-4 w-4" />
            Download Guide as Markdown
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="prose prose-slate max-w-none dark:prose-invert
            prose-headings:font-bold
            prose-h1:text-3xl prose-h1:mb-4 prose-h1:border-b prose-h1:pb-2
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:my-3
            prose-ul:my-3 prose-ul:list-disc
            prose-ol:my-3 prose-ol:list-decimal
            prose-li:my-1
            prose-table:my-6
            prose-th:bg-gray-100 prose-th:p-2 prose-th:border
            prose-td:p-2 prose-td:border
            prose-strong:font-semibold prose-strong:text-gray-900
            prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

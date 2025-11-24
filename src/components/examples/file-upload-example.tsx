'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { toast } from '@/hooks/use-toast';

export function FileUploadExample() {
  const [singleFile, setSingleFile] = useState<string>('');
  const [multipleFiles, setMultipleFiles] = useState<string[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null);

  const handlePreview = (objectKey: string) => {
    setPreviewObjectKey(objectKey);
    setPreviewModalOpen(true);
  };

  const handleSubmit = () => {
    console.log('Single file:', singleFile);
    console.log('Multiple files:', multipleFiles);
    
    toast({
      title: 'Success',
      description: 'Files have been added to the request',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Single File Upload Example</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Evaluation Form"
            description="Upload employee evaluation form (PDF or Word)"
            accept=".pdf,.doc,.docx"
            folder="evaluation-forms"
            value={singleFile}
            onChange={(value) => setSingleFile(value as string)}
            onPreview={handlePreview}
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Multiple Files Upload Example</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Appointment Documents"
            description="Upload all appointment documents (up to 5 files)"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            folder="appointment-documents"
            multiple
            value={multipleFiles}
            onChange={(value) => setMultipleFiles(value as string[])}
            onPreview={handlePreview}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Single File:</h4>
              <p className="text-sm text-muted-foreground">
                {singleFile || 'No file selected'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Multiple Files:</h4>
              <p className="text-sm text-muted-foreground">
                {multipleFiles.length > 0 
                  ? `${multipleFiles.length} files selected`
                  : 'No files selected'}
              </p>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={!singleFile && multipleFiles.length === 0}
            >
              Submit Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <FilePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        objectKey={previewObjectKey}
      />
    </div>
  );
}
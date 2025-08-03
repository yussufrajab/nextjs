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
      title: 'Mafanikio',
      description: 'Faili zimeongezwa kwenye ombi',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mfano wa Kupakia Faili Moja</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Fomu ya Tathmini"
            description="Pakia fomu ya tathmini ya mfanyakazi (PDF au Word)"
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
          <CardTitle>Mfano wa Kupakia Faili Nyingi</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Hati za Uteuzi"
            description="Pakia hati zote za uteuzi (hadi faili 5)"
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
          <CardTitle>Muhtasari wa Faili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Faili Moja:</h4>
              <p className="text-sm text-muted-foreground">
                {singleFile || 'Hakuna faili iliyochaguliwa'}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">Faili Nyingi:</h4>
              <p className="text-sm text-muted-foreground">
                {multipleFiles.length > 0 
                  ? `${multipleFiles.length} faili zimechaguliwa`
                  : 'Hakuna faili zilizochaguliwa'}
              </p>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={!singleFile && multipleFiles.length === 0}
            >
              Wasilisha Ombi
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
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useFileExists } from '@/hooks/use-file-exists';
import { Loader2, Upload, FileText, Eye, ExternalLink, Download, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

interface DocumentUploadProps {
  employeeId: string;
  documentType: 'ardhil-hali' | 'confirmation-letter' | 'job-contract' | 'birth-certificate';
  documentTitle: string;
  currentUrl?: string;
  canUpload: boolean;
  userRole?: string;
  userInstitutionId?: string;
  onUploadSuccess?: (documentUrl: string) => void;
}

export function DocumentUpload({
  employeeId,
  documentType,
  documentTitle,
  currentUrl,
  canUpload,
  userRole,
  userInstitutionId,
  onUploadSuccess
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  // Check if the file actually exists in storage
  const fileExists = useFileExists(currentUrl);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      if (userRole) formData.append('userRole', userRole);
      if (userInstitutionId) formData.append('userInstitutionId', userInstitutionId);

      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      toast({
        title: "Upload successful",
        description: `${documentTitle} has been uploaded successfully`
      });

      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById(`file-${documentType}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(result.data.documentUrl);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = () => {
    if (currentUrl && fileExists.exists) {
      setIsPreviewModalOpen(true);
    } else if (currentUrl && !fileExists.exists) {
      toast({
        title: "Document not available",
        description: "The document is not available at this time",
        variant: "destructive"
      });
    }
  };

  const handleDownload = () => {
    if (!currentUrl) return;

    if (!fileExists.exists) {
      toast({
        title: "Document not available",
        description: "The document is not available at this time",
        variant: "destructive"
      });
      return;
    }

    // Extract the object key from the URL - handle different URL formats
    let objectKey = '';
    if (currentUrl.startsWith('/api/files/download/')) {
      objectKey = currentUrl.replace('/api/files/download/', '');
    } else if (currentUrl.startsWith('/api/files/')) {
      objectKey = currentUrl.replace('/api/files/', '');
    }

    // Use direct link approach instead of blob for better compatibility
    const downloadUrl = `/api/files/download/${objectKey}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = getFileName(objectKey);
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Download started",
      description: `Downloading ${documentTitle}...`
    });
  };

  const getFileName = (urlPath: string) => {
    const parts = urlPath.split('/');
    return parts[parts.length - 1] || `${documentType}.pdf`;
  };

  const getObjectKey = () => {
    if (!currentUrl) return null;
    if (currentUrl.startsWith('/api/files/download/')) {
      return currentUrl.replace('/api/files/download/', '');
    } else if (currentUrl.startsWith('/api/files/')) {
      return currentUrl.replace('/api/files/', '');
    }
    return null;
  };

  return (
    <Card className="p-4 border bg-background">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label className="font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {documentTitle}:
          </Label>
          
          {currentUrl ? (
            <div className="flex items-center gap-2 mt-1">
              {fileExists.loading ? (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : fileExists.exists ? (
                <>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Available
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        <MoreVertical className="h-3 w-3 mr-1" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleView}>
                        <Eye className="h-3 w-3 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownload}>
                        <Download className="h-3 w-3 mr-2" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Document not available
                </Badge>
              )}
            </div>
          ) : (
            <div className="mt-1">
              <Badge variant="outline" className="text-muted-foreground">
                Not Available
              </Badge>
            </div>
          )}
        </div>

        {canUpload && (
          <div className="flex flex-col gap-2">
            {!selectedFile ? (
              <div>
                <Input
                  id={`file-${documentType}`}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`file-${documentType}`)?.click()}
                  className="h-8"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {currentUrl ? 'Replace' : 'Upload'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="text-xs text-muted-foreground truncate max-w-32" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="h-7 text-xs"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 mr-1" />
                    )}
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FilePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        objectKey={getObjectKey()}
        title={`${documentTitle} Preview`}
      />
    </Card>
  );
}
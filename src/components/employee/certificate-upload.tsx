'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useFileExists } from '@/hooks/use-file-exists';
import { Loader2, Upload, FileText, Eye, Download, MoreVertical, Trash2, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Certificate {
  id: string;
  type: string;
  name: string;
  url: string | null;
}

interface CertificateUploadProps {
  employeeId: string;
  certificateType: string;
  certificateTitle: string;
  currentCertificate?: Certificate;
  canUpload: boolean;
  userRole?: string;
  userInstitutionId?: string;
  onUploadSuccess?: (certificate: Certificate) => void;
  onDeleteSuccess?: (certificateType: string) => void;
}

export function CertificateUpload({
  employeeId,
  certificateType,
  certificateTitle,
  currentCertificate,
  canUpload,
  userRole,
  userInstitutionId,
  onUploadSuccess,
  onDeleteSuccess
}: CertificateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [certificateName, setCertificateName] = useState('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  // Check if the certificate file actually exists in storage
  const fileExists = useFileExists(currentCertificate?.url);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

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
    if (!selectedFile || !certificateName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a file and enter a certificate name",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('certificateType', certificateType);
      formData.append('certificateName', certificateName.trim());
      if (userRole) formData.append('userRole', userRole);
      if (userInstitutionId) formData.append('userInstitutionId', userInstitutionId);

      const response = await fetch(`/api/employees/${employeeId}/certificates`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      toast({
        title: "Upload successful",
        description: `${certificateTitle} has been uploaded successfully`
      });

      // Reset form
      setSelectedFile(null);
      setCertificateName('');
      setIsUploadDialogOpen(false);
      
      // Reset file input
      const fileInput = document.getElementById(`file-${certificateType}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess({
          id: result.data.certificateId || 'new',
          type: certificateType,
          name: result.data.certificateName,
          url: result.data.certificateUrl
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload certificate",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = () => {
    if (currentCertificate?.url && fileExists.exists) {
      setIsPreviewModalOpen(true);
    } else if (currentCertificate?.url && !fileExists.exists) {
      toast({
        title: "Document not available",
        description: "The certificate is not available at this time",
        variant: "destructive"
      });
    }
  };

  const handleDownload = () => {
    if (!currentCertificate?.url) return;
    
    if (!fileExists.exists) {
      toast({
        title: "Document not available",
        description: "The certificate is not available at this time",
        variant: "destructive"
      });
      return;
    }

    // Extract the object key from the URL - handle different URL formats
    let objectKey = '';
    if (currentCertificate.url.startsWith('/api/files/download/')) {
      objectKey = currentCertificate.url.replace('/api/files/download/', '');
    } else if (currentCertificate.url.startsWith('/api/files/')) {
      objectKey = currentCertificate.url.replace('/api/files/', '');
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
      description: `Downloading ${certificateTitle}...`
    });
  };

  const handleDelete = async () => {
    if (!currentCertificate?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/certificates?certificateId=${currentCertificate.id}&userRole=${userRole}&userInstitutionId=${userInstitutionId}`,
        {
          method: 'DELETE'
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Delete failed');
      }

      toast({
        title: "Delete successful",
        description: `${certificateTitle} has been deleted successfully`
      });

      // Call success callback
      if (onDeleteSuccess) {
        onDeleteSuccess(certificateType);
      }

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete certificate",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileName = (urlPath: string) => {
    const parts = urlPath.split('/');
    return parts[parts.length - 1] || `${certificateType}.pdf`;
  };

  const getObjectKey = () => {
    if (!currentCertificate?.url) return null;
    if (currentCertificate.url.startsWith('/api/files/download/')) {
      return currentCertificate.url.replace('/api/files/download/', '');
    } else if (currentCertificate.url.startsWith('/api/files/')) {
      return currentCertificate.url.replace('/api/files/', '');
    }
    return null;
  };

  return (
    <Card className="p-4 border bg-background">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label className="font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {certificateTitle}:
          </Label>
          
          {currentCertificate ? (
            <div className="mt-1">
              <p className="text-muted-foreground text-xs">{currentCertificate.name}</p>
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
                    {currentCertificate.url && (
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
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    Document not available
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-muted-foreground text-xs italic">Not Available</p>
              <Badge variant="outline" className="text-muted-foreground mt-1">
                No Document
              </Badge>
            </div>
          )}
        </div>

        {canUpload && (
          <div className="flex flex-col gap-2">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {currentCertificate ? 'Replace' : 'Upload'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {currentCertificate ? 'Replace' : 'Upload'} {certificateTitle}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="certificateName">Certificate Name</Label>
                    <Input
                      id="certificateName"
                      placeholder={`e.g., ${certificateTitle} from University Name`}
                      value={certificateName}
                      onChange={(e) => setCertificateName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`file-${certificateType}`}>Select PDF File</Label>
                    <Input
                      id={`file-${certificateType}`}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                    />
                  </div>
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsUploadDialogOpen(false);
                        setSelectedFile(null);
                        setCertificateName('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || !selectedFile || !certificateName.trim()}
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <FilePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        objectKey={getObjectKey()}
        title={`${certificateTitle} Preview`}
      />
    </Card>
  );
}
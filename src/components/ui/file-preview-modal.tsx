'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, X, FileText, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectKey: string | null;
  title?: string;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  objectKey,
  title = 'File Preview',
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && objectKey) {
      loadPreview();
    } else {
      // Clean up when modal closes
      setPreviewUrl(null);
      setContentType('');
      setError(null);
    }
  }, [open, objectKey]);

  const loadPreview = async () => {
    if (!objectKey) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading preview for objectKey:', objectKey);
      console.log('ObjectKey type:', typeof objectKey);
      console.log('ObjectKey length:', objectKey.length);

      // The preview API streams the file directly, so we just need to construct the URL
      // Use session-based authentication (cookies will be sent automatically)
      const previewApiUrl = `/api/files/preview/${encodeURIComponent(objectKey)}`;
      console.log('Preview API URL:', previewApiUrl);

      // Test if the file exists by making a HEAD request first
      const testResponse = await fetch(previewApiUrl, {
        method: 'HEAD',
        credentials: 'include', // Include cookies for session auth
      });

      if (!testResponse.ok) {
        throw new Error(
          `File not accessible: ${testResponse.status} ${testResponse.statusText}`
        );
      }

      // Get content type from headers
      const responseContentType =
        testResponse.headers.get('content-type') || 'application/pdf';
      console.log('Content type from headers:', responseContentType);

      // Set the preview URL directly to the API endpoint
      setPreviewUrl(previewApiUrl);
      setContentType(responseContentType);

      console.log('Preview URL set to:', previewApiUrl);
    } catch (error: any) {
      console.error('Preview error:', error);
      setError(error.message || 'Failed to load file preview');
      toast({
        title: 'Preview Error',
        description: `Failed to load file preview: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (objectKey) {
      console.log('Download - Object key:', objectKey);

      const downloadUrl = `/api/files/download/${encodeURIComponent(objectKey)}`;
      console.log('Download URL:', downloadUrl);

      // Use session-based authentication (cookies will be sent automatically)
      fetch(downloadUrl, {
        credentials: 'include', // Include cookies for session auth
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Download failed: ${response.status} ${response.statusText}`
            );
          }
          return response.blob();
        })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = getFileName(objectKey);
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast({
            title: 'Success',
            description: 'File downloaded successfully',
          });
        })
        .catch((error) => {
          console.error('Download error:', error);
          toast({
            title: 'Download Error',
            description: `Failed to download file: ${error.message}`,
            variant: 'destructive',
          });
        });
    }
  };

  const getFileName = (key: string) => {
    const parts = key.split('/');
    return parts[parts.length - 1] || key;
  };

  const canPreviewInline = (type: string) => {
    return type.startsWith('image/') || type === 'application/pdf';
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={loadPreview}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No preview available</p>
          </div>
        </div>
      );
    }

    if (canPreviewInline(contentType)) {
      if (contentType.startsWith('image/')) {
        return (
          <div className="flex items-center justify-center p-4">
            <img
              src={previewUrl}
              alt="File preview"
              className="max-w-full max-h-96 object-contain rounded-lg"
              onError={() => setError('Failed to load image')}
            />
          </div>
        );
      }

      if (contentType === 'application/pdf') {
        return (
          <div className="h-[31.2rem]">
            <iframe
              src={previewUrl}
              className="w-full h-full border rounded-lg"
              title="PDF Preview"
              onError={() => setError('Failed to load PDF')}
            />
          </div>
        );
      }
    }

    // For other file types, show download option
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Preview not available for this file type
          </p>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[67.2rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center space-x-2">
              {objectKey && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
          {objectKey && (
            <p className="text-sm text-muted-foreground">
              {getFileName(objectKey)}
            </p>
          )}
        </DialogHeader>

        <div className="mt-4">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  );
}

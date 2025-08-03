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
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

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
  title = 'Muhtasari wa Faili'
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
      
      // Use API client which handles authentication automatically
      // Don't encode the objectKey as the backend will handle it
      const result = await apiClient.request(`/files/preview/${objectKey}`);
      console.log('Preview result:', result);
      
      if (result.success && result.data) {
        console.log('Preview data:', result.data);
        console.log('Preview data keys:', Object.keys(result.data));
        
        // Handle nested response structure from Next.js API route
        let previewData = result.data;
        if (result.data.data && typeof result.data.data === 'object') {
          console.log('Using nested data structure');
          previewData = result.data.data;
        }
        
        console.log('Final preview data:', previewData);
        console.log('Preview URL from data:', previewData.url);
        console.log('Content type from data:', previewData.contentType);
        
        setPreviewUrl(previewData.url);
        setContentType(previewData.contentType || 'application/pdf');
      } else {
        console.error('Preview failed:', result.message);
        throw new Error(result.message || 'Failed to load preview');
      }

    } catch (error: any) {
      console.error('Preview error:', error);
      setError(error.message || 'Failed to load file preview');
      toast({
        title: 'Kosa la Muhtasari',
        description: `Imeshindwa kupakia muhtasari wa faili: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const { accessToken } = useAuthStore();

  const handleDownload = () => {
    if (objectKey) {
      // Use Next.js API route for download (which handles auth)
      const token = accessToken || localStorage.getItem('accessToken');
      
      console.log('Download - Using token:', token ? 'present' : 'missing');
      console.log('Download - Object key:', objectKey);
      
      if (token) {
        // Use the Next.js API route which will proxy to backend
        fetch(`/api/files/download/${objectKey}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Download failed');
          }
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = getFileName(objectKey);
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        })
        .catch(error => {
          console.error('Download error:', error);
          toast({
            title: 'Kosa la Kupakua',
            description: 'Imeshindwa kupakia faili',
            variant: 'destructive'
          });
        });
      } else {
        toast({
          title: 'Kosa la Uthibitishaji',
          description: 'Huna ruhusa ya kupakia faili',
          variant: 'destructive'
        });
      }
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
            <p className="text-muted-foreground">Inapakia muhtasari...</p>
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
              Jaribu Tena
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
            <p className="text-muted-foreground">Hakuna muhtasari unapatikana</p>
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
          <div className="h-96">
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
            Muhtasari haupatikani kwa aina hii ya faili
          </p>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Pakua Faili
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center space-x-2">
              {objectKey && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Pakua
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

        <div className="mt-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
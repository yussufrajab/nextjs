'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, X, FileText, Eye, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  folder?: string;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onPreview?: (objectKey: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface UploadedFile {
  objectKey: string;
  originalName: string;
  size: number;
  contentType: string;
}

export function FileUpload({
  label,
  description,
  accept = '.pdf',
  maxSize = 2,
  multiple = false,
  folder = 'documents',
  value,
  onChange,
  onPreview,
  disabled = false,
  required = false,
  className
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  
  // Get auth state
  const { accessToken, user } = useAuthStore();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadedFiles = React.useMemo(() => {
    if (!value) return [];
    const keys = Array.isArray(value) ? value : [value];
    return keys.filter(Boolean);
  }, [value]);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled || uploading) return;

    const fileArray = Array.from(files);
    
    // Validate files
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: 'Kosa la Ukubwa wa Faili',
          description: `Faili ${file.name} ni kubwa kuliko ${maxSize}MB`,
          variant: 'destructive'
        });
        return;
      }

      // Check file type if accept is specified for PDF only
      if (accept === '.pdf' && file.type !== 'application/pdf') {
        toast({
          title: 'Kosa la Aina ya Faili',
          description: `Faili ${file.name} si aina ya PDF. Tafadhali chagua faili la PDF tu.`,
          variant: 'destructive'
        });
        return;
      }
    }

    if (!multiple && fileArray.length > 1) {
      toast({
        title: 'Kosa',
        description: 'Unaweza kupakia faili moja tu',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadedKeys: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        // Simulate progress for UI
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);

        // Use auth token from the hook
        const token = accessToken;
        console.log('FileUpload - Token from auth hook:', token ? 'YES' : 'NO');
        console.log('FileUpload - User role from auth hook:', user?.role);
        
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('FileUpload - Sending Authorization header with token');
        } else {
          console.error('FileUpload - No token found, request will fail');
        }

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'include'
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Upload failed');
        }

        const result = await response.json();
        if (result.success) {
          uploadedKeys.push(result.data.objectKey);
        } else {
          throw new Error(result.message || 'Upload failed');
        }

        setUploadProgress(((i + 1) / fileArray.length) * 100);
      }

      // Update value
      if (multiple) {
        const currentKeys = Array.isArray(value) ? value : [];
        onChange?.([ ...currentKeys, ...uploadedKeys]);
      } else {
        onChange?.(uploadedKeys[0]);
      }

      toast({
        title: 'Mafanikio',
        description: `${uploadedKeys.length} faili ${uploadedKeys.length === 1 ? 'imepakuliwa' : 'zimepakuliwa'} kwa mafanikio`,
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Kosa la Kupakia',
        description: error.message || 'Imeshindwa kupakia faili',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [disabled, uploading, maxSize, multiple, folder, value, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleRemoveFile = useCallback((indexOrKey: number | string) => {
    if (disabled) return;

    if (multiple) {
      const currentKeys = Array.isArray(value) ? value : [];
      const newKeys = typeof indexOrKey === 'number' 
        ? currentKeys.filter((_, i) => i !== indexOrKey)
        : currentKeys.filter(key => key !== indexOrKey);
      onChange?.(newKeys);
    } else {
      onChange?.('');
    }
  }, [disabled, multiple, value, onChange]);

  const handlePreview = useCallback((objectKey: string) => {
    if (onPreview) {
      onPreview(objectKey);
    } else {
      // Default preview behavior - open in new tab
      window.open(`/api/files/preview/${encodeURIComponent(objectKey)}`, '_blank');
    }
  }, [onPreview]);

  const handleDownload = useCallback((objectKey: string) => {
    window.open(`/api/files/download/${encodeURIComponent(objectKey)}`, '_blank');
  }, []);

  const getFileIcon = (objectKey: string) => {
    const extension = objectKey.split('.').pop()?.toLowerCase();
    return <FileText className="h-4 w-4" />;
  };

  const getFileName = (objectKey: string) => {
    const parts = objectKey.split('/');
    return parts[parts.length - 1] || objectKey;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Bofya au buruta faili hapa kupakia
        </p>
        <p className="text-xs text-muted-foreground">
          Ukubwa wa juu: {maxSize}MB | Aina zilizoruhusiwa: {accept.replace(/\./g, '').toUpperCase()}
        </p>
        
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Inapakia...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Faili Zilizopakuliwa:</Label>
          <div className="space-y-2">
            {uploadedFiles.map((objectKey, index) => (
              <div
                key={objectKey}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getFileIcon(objectKey)}
                  <span className="text-sm truncate" title={getFileName(objectKey)}>
                    {getFileName(objectKey)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(objectKey)}
                    className="h-8 w-8 p-0"
                    title="Angalia"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(objectKey)}
                    className="h-8 w-8 p-0"
                    title="Pakua"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(multiple ? index : objectKey)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Ondoa"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
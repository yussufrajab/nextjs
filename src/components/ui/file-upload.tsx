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
          title: 'File Size Error',
          description: `File ${file.name} is larger than ${maxSize}MB`,
          variant: 'destructive'
        });
        return;
      }

      // Check file type if accept is specified for PDF only
      if (accept === '.pdf' && file.type !== 'application/pdf') {
        toast({
          title: 'File Type Error',
          description: `File ${file.name} is not a PDF file. Please select only PDF files.`,
          variant: 'destructive'
        });
        return;
      }
    }

    if (!multiple && fileArray.length > 1) {
      toast({
        title: 'Error',
        description: 'You can only upload one file',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadedKeys: string[] = [];
      const failedFiles: string[] = [];

      // Calculate total size for weighted progress
      const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      const fileProgress: { [key: number]: number } = {};

      // Upload files with real progress tracking using XMLHttpRequest
      const uploadFile = async (file: File, index: number) => {
        return new Promise<{ success: boolean; objectKey?: string; fileName: string; error?: string }>((resolve) => {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            const xhr = new XMLHttpRequest();

            // Track upload progress for this specific file
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                // Store progress for this file (0-100)
                fileProgress[index] = (e.loaded / e.total) * 100;

                // Calculate weighted average progress across all files
                let totalProgress = 0;
                fileArray.forEach((f, i) => {
                  const progress = fileProgress[i] || 0;
                  const weight = f.size / totalSize;
                  totalProgress += progress * weight;
                });

                setUploadProgress(totalProgress);
              }
            });

            xhr.addEventListener('load', async () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  if (result.success) {
                    resolve({ success: true, objectKey: result.data.objectKey, fileName: file.name });
                  } else {
                    resolve({ success: false, error: result.message || 'Upload failed', fileName: file.name });
                  }
                } catch (error: any) {
                  resolve({ success: false, error: 'Invalid server response', fileName: file.name });
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  resolve({ success: false, error: errorData.message || 'Upload failed', fileName: file.name });
                } catch {
                  resolve({ success: false, error: `Upload failed with status ${xhr.status}`, fileName: file.name });
                }
              }
            });

            xhr.addEventListener('error', () => {
              resolve({ success: false, error: 'Network error occurred', fileName: file.name });
            });

            xhr.addEventListener('abort', () => {
              resolve({ success: false, error: 'Upload was cancelled', fileName: file.name });
            });

            xhr.open('POST', '/api/files/upload');
            xhr.withCredentials = true; // Include cookies for session-based auth
            xhr.send(formData);

          } catch (error: any) {
            console.error(`Upload error for ${file.name}:`, error);
            resolve({ success: false, error: error.message, fileName: file.name });
          }
        });
      };

      // Upload all files in parallel
      const uploadPromises = fileArray.map((file, index) => uploadFile(file, index));
      const results = await Promise.all(uploadPromises);

      // Process results
      results.forEach(result => {
        if (result.success && result.objectKey) {
          uploadedKeys.push(result.objectKey);
        } else {
          failedFiles.push(result.fileName);
        }
      });

      // Update value with successfully uploaded files
      if (uploadedKeys.length > 0) {
        if (multiple) {
          const currentKeys = Array.isArray(value) ? value : [];
          onChange?.([ ...currentKeys, ...uploadedKeys]);
        } else {
          onChange?.(uploadedKeys[0]);
        }
      }

      // Show appropriate toast based on results
      if (uploadedKeys.length > 0 && failedFiles.length === 0) {
        // All uploads successful
        toast({
          title: 'Success',
          description: `${uploadedKeys.length} file${uploadedKeys.length === 1 ? '' : 's'} uploaded successfully`,
        });
      } else if (uploadedKeys.length > 0 && failedFiles.length > 0) {
        // Partial success
        toast({
          title: 'Partial Upload',
          description: `${uploadedKeys.length} file(s) uploaded. ${failedFiles.length} file(s) failed: ${failedFiles.join(', ')}`,
          variant: 'default',
        });
      } else {
        // All uploads failed
        throw new Error(`All uploads failed. Files: ${failedFiles.join(', ')}`);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [disabled, uploading, maxSize, multiple, folder, value, onChange, user]);

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
          Click or drag files here to upload
        </p>
        <p className="text-xs text-muted-foreground">
          Max size: {maxSize}MB | Allowed types: PDF only
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
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files:</Label>
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
                    title="Preview"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(objectKey)}
                    className="h-8 w-8 p-0"
                    title="Download"
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
                      title="Remove"
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
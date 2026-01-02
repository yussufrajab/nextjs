/**
 * MinIO Usage Examples
 *
 * This file demonstrates how to use the MinIO file storage
 * integration in your Next.js application.
 */

import {
  uploadFile,
  downloadFile,
  getFileMetadata,
  generatePresignedUrl,
  deleteFile,
  listFiles,
  ensureBucketExists,
  generateObjectKey,
  minioClient,
  DEFAULT_BUCKET,
} from '@/lib/minio';

// ============================================
// Example 1: Upload a file from API route
// ============================================
export async function handleFileUpload(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const folder = 'documents'; // or 'images', 'reports', etc.

    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type');
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File too large');
    }

    // Generate unique object key
    const objectKey = generateObjectKey(folder, file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    const result = await uploadFile(buffer, objectKey, file.type);

    console.log('File uploaded successfully:', result);

    return {
      success: true,
      objectKey: result.objectKey,
      url: `/api/files/preview/${result.objectKey}`,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// ============================================
// Example 2: Download a file
// ============================================
export async function handleFileDownload(objectKey: string) {
  try {
    // Get file stream
    const stream = await downloadFile(objectKey);

    // Get metadata for content type
    const metadata = await getFileMetadata(objectKey);

    return {
      stream,
      metadata,
    };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// ============================================
// Example 3: Generate temporary download link
// ============================================
export async function generateTemporaryLink(objectKey: string) {
  try {
    // Generate URL that expires in 1 hour (3600 seconds)
    const url = await generatePresignedUrl(objectKey, 3600);

    return {
      url,
      expiresIn: 3600,
    };
  } catch (error) {
    console.error('Presigned URL error:', error);
    throw error;
  }
}

// ============================================
// Example 4: List all files in a folder
// ============================================
export async function listDocuments(folderPrefix = 'documents/') {
  try {
    const files = await listFiles(folderPrefix);

    // Get metadata for each file
    const filesWithMetadata = await Promise.all(
      files.map(async (file: any) => {
        const metadata = await getFileMetadata(file.name);
        return {
          name: file.name,
          size: metadata.size,
          contentType: metadata.contentType,
          lastModified: metadata.lastModified,
          downloadUrl: `/api/files/download/${file.name}`,
          previewUrl: `/api/files/preview/${file.name}`,
        };
      })
    );

    return filesWithMetadata;
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
}

// ============================================
// Example 5: Delete a file
// ============================================
export async function handleFileDelete(objectKey: string) {
  try {
    await deleteFile(objectKey);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

// ============================================
// Example 6: Check if file exists
// ============================================
export async function checkFileExists(objectKey: string) {
  try {
    const metadata = await getFileMetadata(objectKey);

    return {
      exists: true,
      metadata,
    };
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return {
        exists: false,
      };
    }
    throw error;
  }
}

// ============================================
// Example 7: Initialize bucket on app startup
// ============================================
export async function initializeMinIO() {
  try {
    await ensureBucketExists(DEFAULT_BUCKET);
    console.log(`MinIO bucket '${DEFAULT_BUCKET}' is ready`);

    return true;
  } catch (error) {
    console.error('MinIO initialization error:', error);
    throw error;
  }
}

// ============================================
// Example 8: Upload with progress tracking
// ============================================
export async function uploadWithProgress(
  file: File,
  onProgress?: (percent: number) => void
) {
  try {
    const folder = 'documents';
    const objectKey = generateObjectKey(folder, file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // For actual progress tracking, you would need to use
    // the MinIO client directly with a custom implementation
    // This is a simplified example
    if (onProgress) {
      onProgress(50); // Halfway through conversion
    }

    const result = await uploadFile(buffer, objectKey, file.type);

    if (onProgress) {
      onProgress(100); // Complete
    }

    return result;
  } catch (error) {
    console.error('Upload with progress error:', error);
    throw error;
  }
}

// ============================================
// Example 9: Batch file operations
// ============================================
export async function batchDeleteFiles(objectKeys: string[]) {
  try {
    const results = await Promise.allSettled(
      objectKeys.map((key) => deleteFile(key))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      total: objectKeys.length,
      successful,
      failed,
      results,
    };
  } catch (error) {
    console.error('Batch delete error:', error);
    throw error;
  }
}

// ============================================
// Example 10: Copy file (backup)
// ============================================
export async function backupFile(sourceKey: string, backupFolder = 'backups') {
  try {
    // Download the file
    const stream = await downloadFile(sourceKey);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Get original metadata
    const metadata = await getFileMetadata(sourceKey);

    // Generate new object key in backup folder
    const filename = sourceKey.split('/').pop() || 'backup';
    const backupKey = generateObjectKey(backupFolder, filename);

    // Upload to backup location
    const result = await uploadFile(buffer, backupKey, metadata.contentType);

    return {
      success: true,
      originalKey: sourceKey,
      backupKey: result.objectKey,
    };
  } catch (error) {
    console.error('Backup error:', error);
    throw error;
  }
}

// ============================================
// Usage in Next.js API Route
// ============================================

/**
 * Example API route for file upload:
 *
 * File: src/app/api/custom-upload/route.ts
 *
 * import { NextRequest, NextResponse } from 'next/server';
 * import { handleFileUpload } from '@/examples/minio-usage-example';
 *
 * export async function POST(request: NextRequest) {
 *   try {
 *     const formData = await request.formData();
 *     const result = await handleFileUpload(formData);
 *
 *     return NextResponse.json(result);
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: error.message },
 *       { status: 500 }
 *     );
 *   }
 * }
 */

// ============================================
// Usage in React Component
// ============================================

/**
 * Example React component for file upload:
 *
 * 'use client';
 *
 * import { useState } from 'react';
 *
 * export function FileUploader() {
 *   const [uploading, setUploading] = useState(false);
 *
 *   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
 *     e.preventDefault();
 *     setUploading(true);
 *
 *     const formData = new FormData(e.currentTarget);
 *
 *     try {
 *       const response = await fetch('/api/files/upload', {
 *         method: 'POST',
 *         body: formData
 *       });
 *
 *       const result = await response.json();
 *
 *       if (result.success) {
 *         console.log('File uploaded:', result.data);
 *         // Handle success
 *       }
 *     } catch (error) {
 *       console.error('Upload failed:', error);
 *     } finally {
 *       setUploading(false);
 *     }
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input type="file" name="file" accept=".pdf" required />
 *       <button type="submit" disabled={uploading}>
 *         {uploading ? 'Uploading...' : 'Upload'}
 *       </button>
 *     </form>
 *   );
 * }
 */

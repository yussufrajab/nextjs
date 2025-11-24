import { Client as MinioClient } from 'minio';

// MinIO client configuration from environment variables
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin123';
const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000');
const useSSL = process.env.MINIO_USE_SSL === 'true';

console.log('MinIO credentials check:', {
  accessKey,
  secretKey: secretKey ? '[CONFIGURED]' : '[MISSING]',
  endPoint,
  port,
  useSSL,
  NODE_ENV: process.env.NODE_ENV
});

const minioClient = new MinioClient({
  endPoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

// Default bucket name
export const DEFAULT_BUCKET = 'csms-files';

// Initialize MinIO bucket if it doesn't exist
export async function ensureBucketExists(bucketName: string = DEFAULT_BUCKET) {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket ${bucketName} created successfully`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}

// Generate unique object key
export function generateObjectKey(folder: string, originalName: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${timestamp}_${randomSuffix}_${sanitizedName}`;
}

// Upload file to MinIO
export async function uploadFile(
  file: Buffer | string,
  objectKey: string,
  contentType: string,
  bucketName: string = DEFAULT_BUCKET
) {
  try {
    await ensureBucketExists(bucketName);
    
    const uploadResult = await minioClient.putObject(
      bucketName,
      objectKey,
      file,
      undefined,
      {
        'Content-Type': contentType,
        'Upload-Date': new Date().toISOString(),
      }
    );

    return {
      success: true,
      objectKey,
      etag: uploadResult.etag,
      bucketName,
    };
  } catch (error) {
    console.error('MinIO upload error:', error);
    throw error;
  }
}

// Download file from MinIO
export async function downloadFile(
  objectKey: string,
  bucketName: string = DEFAULT_BUCKET
) {
  try {
    const stream = await minioClient.getObject(bucketName, objectKey);
    return stream;
  } catch (error) {
    console.error('MinIO download error:', error);
    throw error;
  }
}

// Get file metadata
export async function getFileMetadata(
  objectKey: string,
  bucketName: string = DEFAULT_BUCKET
) {
  try {
    const stat = await minioClient.statObject(bucketName, objectKey);
    return {
      size: stat.size,
      contentType: stat.metaData?.['content-type'] || 'application/octet-stream',
      lastModified: stat.lastModified,
      etag: stat.etag,
    };
  } catch (error) {
    console.error('MinIO metadata error:', error);
    throw error;
  }
}

// Generate presigned URL for file access
export async function generatePresignedUrl(
  objectKey: string,
  expiry: number = 24 * 60 * 60, // 24 hours in seconds
  bucketName: string = DEFAULT_BUCKET
) {
  try {
    const url = await minioClient.presignedGetObject(bucketName, objectKey, expiry);
    return url;
  } catch (error) {
    console.error('MinIO presigned URL error:', error);
    throw error;
  }
}

// Delete file from MinIO
export async function deleteFile(
  objectKey: string,
  bucketName: string = DEFAULT_BUCKET
) {
  try {
    await minioClient.removeObject(bucketName, objectKey);
    return { success: true };
  } catch (error) {
    console.error('MinIO delete error:', error);
    throw error;
  }
}

// List files in a folder
export async function listFiles(
  prefix: string = '',
  bucketName: string = DEFAULT_BUCKET
) {
  try {
    const objects: any[] = [];
    const stream = minioClient.listObjects(bucketName, prefix, true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => objects.push(obj));
      stream.on('error', reject);
      stream.on('end', () => resolve(objects));
    });
  } catch (error) {
    console.error('MinIO list error:', error);
    throw error;
  }
}

export { minioClient };
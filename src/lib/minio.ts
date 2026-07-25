import { Client as MinioClient } from 'minio';
import { fileLogger } from '@/lib/logger';

// MinIO client configuration from environment variables
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin123';
const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000');
const useSSL = process.env.MINIO_USE_SSL === 'true';

fileLogger.info({
  secretKeyConfigured: !!secretKey,
  endPoint,
  port,
  useSSL,
  nodeEnv: process.env.NODE_ENV,
}, 'MinIO client initialized');

const minioClient = new MinioClient({
  endPoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

// Default bucket name
export const DEFAULT_BUCKET = process.env.MINIO_BUCKET_NAME || 'documents';

// Maximum lifetime (seconds) for any presigned URL.
// SECURITY (Req 10.3): presigned URLs are bearer tokens — anyone who obtains
// one can fetch the object until it expires. The previous 24h default was
// excessive; cap at 1 hour and clamp caller-supplied values so a client cannot
// request a long-lived URL via ?expiry=. Override via env if a use case needs more.
export const MAX_PRESIGNED_URL_EXPIRY_SECONDS = Math.min(
  Number(process.env.MAX_PRESIGNED_URL_EXPIRY_SECONDS) || 3600,
  3600
);

// Initialize MinIO bucket if it doesn't exist
export async function ensureBucketExists(bucketName: string = DEFAULT_BUCKET) {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      fileLogger.info({ bucketName }, 'Bucket created successfully');
    }
  } catch (error) {
    fileLogger.error({ err: error, bucketName }, 'Error ensuring bucket exists');
    throw error;
  }
}

// Generate unique object key
export function generateObjectKey(
  folder: string,
  originalName: string
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedName = sanitizeObjectName(originalName);
  const sanitizedFolder = folder
    .split('/')
    .map((segment) => sanitizeObjectName(segment))
    .join('/');
  return `${sanitizedFolder}/${timestamp}_${randomSuffix}_${sanitizedName}`;
}

// Sanitize a single path segment (folder name or filename) so it can never
// form a path-traversal sequence. Spaces and other illegal characters become
// underscores, runs of dots collapse to a single underscore, and leading/trailing
// dots are stripped. This prevents keys like "..._foo_..pdf" (which previously
// tripped the retrieval guard and returned HTTP 400) while keeping the key
// safe for MinIO.
export function sanitizeObjectName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_') // illegal chars -> underscore
    .replace(/\.{2,}/g, '_') // collapse dot runs (e.g. "..") so traversal is impossible
    .replace(/^\.+/, '') // strip leading dots
    .replace(/\.+$/, '') // strip trailing dots
    .replace(/_+/g, '_') // collapse repeated underscores
    .replace(/^-+/, '') // strip leading dashes
    .replace(/-+$/, ''); // strip trailing dashes
}

// Validate that a reconstructed object key does not attempt path traversal.
// Genuine traversal uses ".." as a path *segment* (e.g. "/../", "../",
// trailing "/.."). A ".." embedded inside a filename (e.g. "report_..pdf") is
// NOT traversal and must remain accessible — it can occur in legacy keys and is
// harmless because MinIO treats the whole string as one object name.
export function isPathTraversal(objectKey: string): boolean {
  if (objectKey.includes('\0')) return true;
  if (objectKey.startsWith('/') || objectKey.endsWith('/')) return true;
  const segments = objectKey.split('/');
  return segments.some((segment) => segment === '..' || segment.startsWith('../') || segment.endsWith('/..'));
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
    fileLogger.error({ err: error, objectKey }, 'MinIO upload error');
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
    fileLogger.error({ err: error, objectKey }, 'MinIO download error');
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
      contentType:
        stat.metaData?.['content-type'] || 'application/octet-stream',
      lastModified: stat.lastModified,
      etag: stat.etag,
    };
  } catch (error) {
    fileLogger.error({ err: error, objectKey }, 'MinIO metadata error');
    throw error;
  }
}

// Generate presigned URL for file access.
// `expiry` is clamped to [1, MAX_PRESIGNED_URL_EXPIRY_SECONDS] so callers
// cannot mint long-lived bearer URLs.
export async function generatePresignedUrl(
  objectKey: string,
  expiry: number = MAX_PRESIGNED_URL_EXPIRY_SECONDS,
  bucketName: string = DEFAULT_BUCKET
) {
  const safeExpiry = Math.max(1, Math.min(expiry, MAX_PRESIGNED_URL_EXPIRY_SECONDS));
  try {
    const url = await minioClient.presignedGetObject(
      bucketName,
      objectKey,
      safeExpiry
    );
    return url;
  } catch (error) {
    fileLogger.error({ err: error, objectKey }, 'MinIO presigned URL error');
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
    fileLogger.error({ err: error, objectKey }, 'MinIO delete error');
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
    fileLogger.error({ err: error, prefix }, 'MinIO list error');
    throw error;
  }
}

export { minioClient };

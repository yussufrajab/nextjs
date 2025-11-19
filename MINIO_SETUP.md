# MinIO File Storage Setup Guide

This guide explains how to set up and use MinIO file storage with your Next.js CSMS application.

## What is MinIO?

MinIO is a high-performance, S3-compatible object storage system. It's perfect for storing and retrieving files like documents, images, and PDFs in your application.

## Installation & Setup

### 1. Install MinIO Server

Run the setup script to download and install MinIO:

```bash
npm run minio:setup
```

This will:
- Download the MinIO binary for your OS/architecture
- Install it to `/usr/local/bin/` (or local directory if no permissions)
- Create the data directory for file storage

### 2. Configure Environment Variables

Your `.env` file has been configured with the following MinIO settings:

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=csms-files
```

**Important for Production:**
- Change `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` to secure values
- Set `MINIO_USE_SSL=true` if using HTTPS
- Update `MINIO_ENDPOINT` to your production domain

### 3. Start MinIO Server

Start the MinIO server:

```bash
npm run minio:start
```

This will start MinIO with:
- **API Endpoint**: http://localhost:9000
- **Console**: http://localhost:9001

Access the MinIO Console at http://localhost:9001 and login with:
- Username: `minioadmin` (or your configured `MINIO_ACCESS_KEY`)
- Password: `minioadmin` (or your configured `MINIO_SECRET_KEY`)

## Usage in Your Application

### API Endpoints

The application includes the following file management endpoints:

#### 1. Upload File
```
POST /api/files/upload
Content-Type: multipart/form-data

Body:
- file: File (PDF only, max 2MB)
- folder: string (optional, default: "documents")

Response:
{
  "success": true,
  "data": {
    "objectKey": "documents/1234567890_abc123_filename.pdf",
    "originalName": "filename.pdf",
    "size": 123456,
    "contentType": "application/pdf",
    "etag": "...",
    "bucketName": "csms-files"
  }
}
```

#### 2. Download File
```
GET /api/files/download/[...objectKey]

Example: GET /api/files/download/documents/1234567890_abc123_filename.pdf

Response: File download with Content-Disposition: attachment
```

#### 3. Preview File
```
GET /api/files/preview/[...objectKey]?mode=inline&expiry=3600

Modes:
- inline: Stream file directly (default)
- presigned: Get a temporary signed URL

Response (inline): File stream with Content-Disposition: inline
Response (presigned): { "presignedUrl": "...", "contentType": "...", ... }
```

#### 4. Check File Exists
```
GET /api/files/exists/[...objectKey]

Response:
{
  "exists": true,
  "metadata": {
    "size": 123456,
    "contentType": "application/pdf",
    "lastModified": "2025-10-13T...",
    "etag": "..."
  }
}
```

### Using MinIO Client in Your Code

Import the MinIO utilities:

```typescript
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
  DEFAULT_BUCKET
} from '@/lib/minio';
```

#### Example: Upload a file

```typescript
// In an API route or server component
const buffer = await file.arrayBuffer();
const objectKey = generateObjectKey('documents', file.name);

const result = await uploadFile(
  Buffer.from(buffer),
  objectKey,
  'application/pdf'
);

console.log('Uploaded:', result.objectKey);
```

#### Example: Generate presigned URL

```typescript
// Get a temporary URL (expires in 1 hour)
const url = await generatePresignedUrl(objectKey, 3600);
console.log('Download URL:', url);
```

#### Example: List files in a folder

```typescript
const files = await listFiles('documents/');
console.log('Files:', files);
```

## MinIO Client Functions

### `uploadFile(file, objectKey, contentType, bucketName?)`
Upload a file to MinIO.

### `downloadFile(objectKey, bucketName?)`
Download a file from MinIO (returns a stream).

### `getFileMetadata(objectKey, bucketName?)`
Get file metadata (size, content type, last modified).

### `generatePresignedUrl(objectKey, expiry?, bucketName?)`
Generate a temporary signed URL for file access.

### `deleteFile(objectKey, bucketName?)`
Delete a file from MinIO.

### `listFiles(prefix?, bucketName?)`
List files in a bucket (optionally filtered by prefix).

### `ensureBucketExists(bucketName?)`
Create bucket if it doesn't exist.

### `generateObjectKey(folder, originalName)`
Generate a unique object key for file storage.

## Data Directory

MinIO stores files in the `minio-data` directory by default. You can change this by setting the `MINIO_DATA_DIR` environment variable.

**Important**: Add `minio-data/` to your `.gitignore` to avoid committing uploaded files.

## Running in Production

### Option 1: Using systemd (Linux)

Create a systemd service file `/etc/systemd/system/minio.service`:

```ini
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target

[Service]
Type=notify
Environment="MINIO_ROOT_USER=your-access-key"
Environment="MINIO_ROOT_PASSWORD=your-secret-key"
ExecStart=/usr/local/bin/minio server /var/lib/minio/data --address :9000 --console-address :9001
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio
```

### Option 2: Using PM2

```bash
pm2 start scripts/start-minio.sh --name minio
pm2 save
```

### Option 3: Using Docker

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v /data/minio:/data \
  minio/minio server /data --console-address ":9001"
```

## Security Best Practices

1. **Change default credentials** in production
2. **Use strong passwords** (min 8 characters)
3. **Enable SSL/TLS** for production environments
4. **Configure bucket policies** to control access
5. **Use presigned URLs** for temporary file access
6. **Implement file size limits** to prevent abuse
7. **Validate file types** before upload
8. **Set up regular backups** of MinIO data directory

## Troubleshooting

### MinIO won't start
- Check if port 9000/9001 is already in use: `lsof -i :9000`
- Verify MinIO binary has execute permissions: `chmod +x /usr/local/bin/minio`
- Check data directory permissions

### Connection refused errors
- Ensure MinIO server is running: `ps aux | grep minio`
- Verify endpoint and port in `.env` file
- Check firewall settings

### Files not uploading
- Verify bucket exists (should auto-create on first upload)
- Check access key and secret key configuration
- Review file size limits in upload API route
- Check MinIO server logs

## Additional Resources

- [MinIO Documentation](https://docs.min.io/)
- [MinIO JavaScript Client](https://docs.min.io/docs/javascript-client-quickstart-guide.html)
- [S3 API Compatibility](https://docs.min.io/docs/minio-server-limits-per-tenant.html)

## Support

For issues specific to this integration, check:
1. MinIO client configuration in `src/lib/minio.ts`
2. API routes in `src/app/api/files/`
3. Environment variables in `.env`
4. MinIO server logs

'use client';

import { MinioFileExample } from '@/components/examples/minio-file-example';

export default function TestMinioPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            MinIO Integration Test
          </h1>
          <p className="text-muted-foreground mt-2">
            Test file upload, download, and preview functionality with MinIO
            storage
          </p>
        </div>

        <MinioFileExample />
      </div>
    </div>
  );
}

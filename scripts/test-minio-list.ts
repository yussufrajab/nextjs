import 'dotenv/config';
import { Client as MinioClient } from 'minio';

const client = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const bucket = process.env.MINIO_BUCKET_NAME || 'documents';

async function main() {
  const exists = await client.bucketExists(bucket);
  console.log('Bucket exists:', exists);
  
  const stream = client.listObjects(bucket, 'employee-documents/', true);
  let count = 0;
  let firstKey: string | null = null;
  
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('Timeout after listing', count, 'objects. First key:', firstKey);
      resolve();
    }, 20000);
    
    stream.on('data', (obj: { name?: string }) => {
      count++;
      if (!firstKey && obj.name) firstKey = obj.name;
      if (count <= 3) console.log(`Object ${count}:`, obj.name);
    });
    stream.on('error', (err: Error) => {
      clearTimeout(timeout);
      console.error('Stream error:', err.message);
      reject(err);
    });
    stream.on('end', () => {
      clearTimeout(timeout);
      console.log('Stream ended. Total objects:', count);
      resolve();
    });
  });
  
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

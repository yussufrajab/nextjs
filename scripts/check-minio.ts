import 'dotenv/config';
import { Client as MinioClient } from 'minio';

const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'documents';

async function listAndDeleteRemainingFiles() {
  const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
  if (!bucketExists) {
    console.log('Bucket does not exist');
    return;
  }

  const objectsStream = minioClient.listObjects(BUCKET_NAME, '', true);
  const objects: string[] = [];

  await new Promise<void>((resolve, reject) => {
    objectsStream.on('data', (obj) => {
      if (obj.name) objects.push(obj.name);
    });
    objectsStream.on('error', reject);
    objectsStream.on('end', resolve);
  });

  console.log('Remaining files in MinIO:', objects.length);

  if (objects.length > 0) {
    console.log('\nDeleting remaining files...');
    for (const objectName of objects) {
      await minioClient.removeObject(BUCKET_NAME, objectName);
      console.log('  Deleted:', objectName);
    }
    console.log('\nAll remaining files deleted!');
  }
}

listAndDeleteRemainingFiles();

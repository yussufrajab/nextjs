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
  const stream = client.listObjects(bucket, 'employee-documents/', true);
  const seen = new Map<string, number>();
  let count = 0;
  let duplicates = 0;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log(`Timeout. Total: ${count}, Unique: ${seen.size}, Duplicates: ${duplicates}`);
      // Show a few duplicates
      let shown = 0;
      for (const [key, cnt] of seen) {
        if (cnt > 1 && shown < 5) {
          console.log(`  DUP: ${key} (count: ${cnt})`);
          shown++;
        }
      }
      resolve();
    }, 15000);

    stream.on('data', (obj: { name?: string }) => {
      if (!obj.name) return;
      count++;
      const prev = seen.get(obj.name) || 0;
      if (prev > 0) duplicates++;
      seen.set(obj.name, prev + 1);
    });
    stream.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
    stream.on('end', () => {
      clearTimeout(timeout);
      console.log(`Stream ended. Total: ${count}, Unique: ${seen.size}, Duplicates: ${duplicates}`);
      resolve();
    });
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

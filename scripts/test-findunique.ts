import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  // Test with an existing key
  const existing = await db.fileHash.findUnique({
    where: { objectKey: 'employee-documents/089f548f-4291-4cd5-b024-1a32decbd192_ardhilHali.pdf' },
    select: { id: true },
  });
  console.log('Existing key:', existing);

  // Test with a non-existing key
  const nonExisting = await db.fileHash.findUnique({
    where: { objectKey: 'employee-documents/this-does-not-exist-12345.pdf' },
    select: { id: true },
  });
  console.log('Non-existing key:', nonExisting);

  // Count total
  const count = await db.fileHash.count({ where: { objectKey: { startsWith: 'employee-documents/' } } });
  console.log('Total employee-documents hashes:', count);

  await db.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

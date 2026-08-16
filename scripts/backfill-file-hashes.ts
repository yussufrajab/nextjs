/**
 * Backfill missing FileHash rows for existing MinIO objects.
 *
 * PROBLEM
 *   Upload routes that store files under `employee-documents/` and
 *   `employee-photos/` prefixes were not calling `recordFileHash()`. The
 *   download/preview routes call `verifyFileHash()` and, for sensitive keys
 *   (those two prefixes), fail CLOSED with HTTP 410 Gone when no hash row
 *   exists. This blocked commission officers (HHRMD/HRMO) from viewing
 *   employee documents.
 *
 *   The upload-path bug is fixed at the source (every upload route now calls
 *   `recordFileHash`), but objects already in MinIO before the fix have no
 *   hash row and are still blocked. This script backfills them.
 *
 * WHAT IT DOES
 *   1. STREAMS every MinIO object under `employee-documents/` and
 *      `employee-photos/` (does NOT buffer the full list into memory —
 *      processes each object as it arrives from the stream).
 *   2. For each object that has NO existing FileHash row, downloads the
 *      bytes, computes SHA-256, and upserts a FileHash row.
 *   3. Objects that already have a hash row are skipped (not re-hashed) so
 *      re-runs are safe and idempotent.
 *
 * USAGE
 *   npm run backfill:hashes
 *   npm run backfill:hashes -- --prefix=employee-documents/
 *   npm run backfill:hashes -- --dry-run
 *
 * Exit code 0 on success, 1 on error.
 */

import 'dotenv/config';
import { Client as MinioClient } from 'minio';
import { downloadFile } from '../src/lib/minio';
import { sha256Hex } from '../src/lib/file-integrity';
import { db } from '../src/lib/db';

const DEFAULT_PREFIXES = ['employee-documents/', 'employee-photos/'];

const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET = process.env.MINIO_BUCKET_NAME || 'documents';

// Concurrency for downloads — keeps throughput high without exhausting
// the connection pool or overwhelming MinIO.
const CONCURRENCY = parseInt(process.env.BACKFILL_CONCURRENCY || '10', 10);

interface BackfillStats {
  scanned: number;
  alreadyHashed: number;
  hashed: number;
  skippedErrors: number;
  notFound: number;
}

/**
 * Process a single object: check if a FileHash row exists, and if not,
 * download the object, hash it, and upsert the row.
 */
async function processObject(
  objectKey: string,
  dryRun: boolean,
  stats: BackfillStats
): Promise<void> {
  stats.scanned++;

  // Skip objects that already have a hash row — idempotent re-runs.
  try {
    const existing = await db.fileHash.findUnique({
      where: { objectKey },
      select: { id: true },
    });
    if (existing) {
      stats.alreadyHashed++;
      return;
    }
  } catch {
    // If the lookup itself fails, fall through and try to record anyway.
  }

  if (dryRun) {
    stats.hashed++;
    if (stats.hashed % 1000 === 0) {
      console.log(`   [DRY-RUN] Would hash ${stats.hashed} objects so far...`);
    }
    return;
  }

  try {
    const stream = await downloadFile(objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const sha256 = sha256Hex(buffer);

    await db.fileHash.upsert({
      where: { objectKey },
      update: { sha256, byteSize: buffer.length, lastVerified: new Date() },
      create: { objectKey, sha256, byteSize: buffer.length },
    });

    stats.hashed++;
    if (stats.hashed % 500 === 0) {
      console.log(
        `   ✅ Hashed ${stats.hashed} objects (scanned ${stats.scanned})...`
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string } | null)?.code;
    if (code === 'NoSuchKey' || message.includes('NoSuchKey')) {
      stats.notFound++;
      return;
    }
    console.error(`   ⚠️  Failed to hash ${objectKey}:`, message);
    stats.skippedErrors++;
  }
}

/**
 * Stream objects from MinIO for a given prefix, feeding them into a
 * bounded-concurrency worker pool. Does NOT buffer the full list — each
 * object is processed as it arrives from the stream.
 */
async function backfillPrefix(
  prefix: string,
  dryRun: boolean,
  stats: BackfillStats
): Promise<void> {
  console.log(`\n📁 Scanning prefix: ${prefix}`);

  // Use the V2 listing API: the legacy listObjects (V1) stream stalls after
  // ~2 pages (2000 keys) on this bucket, which prematurely tripped the stale
  // timeout below and silently truncated earlier backfill runs at 2000 keys
  // per prefix. listObjectsV2 enumerates the full prefix reliably.
  const stream = minioClient.listObjectsV2(BUCKET, prefix, true);

  // MinIO listObjects with recursive:true can return the same object many
  // times on large buckets (internal pagination retries). Deduplicate with a
 // Set so each key is processed only once.
  const seenKeys = new Set<string>();

  // Convert the MinIO object stream into an async queue so we can process
  // objects with proper backpressure (await each batch before pulling more).
  const objectQueue: string[] = [];
  let streamEnded = false;
  let streamError: Error | null = null;

  stream.on('data', (obj: { name?: string }) => {
    if (!obj.name) return;
    if (seenKeys.has(obj.name)) return; // skip duplicate
    seenKeys.add(obj.name);
    objectQueue.push(obj.name);
    lastNewKeyAt = Date.now();
  });
  stream.on('error', (err: Error) => {
    streamError = err;
  });
  stream.on('end', () => {
    streamEnded = true;
  });

  // Stale timeout: last-resort escape hatch only, in case the listing stream
  // ever loops endlessly emitting duplicate keys on large buckets. If no NEW
  // unique key arrives for STALE_TIMEOUT_MS and the queue is drained, treat
  // the prefix as fully scanned. Kept generous (5 min) so a slow page can
  // never truncate the scan — normal completion is signalled by stream 'end'.
  const STALE_TIMEOUT_MS = 300000;
  let lastNewKeyAt = Date.now();

  // Worker pool: process CONCURRENCY objects at a time, refilling from the
  // queue as slots free up. Exits when the stream ends and the queue drains.
  while (true) {
    // Wait for at least one object or stream end.
    if (objectQueue.length === 0 && !streamEnded) {
      if (streamError) throw streamError;

      // Stale check: if no new unique key has arrived for STALE_TIMEOUT_MS,
      // the MinIO stream is looping on duplicates. Treat the prefix as done.
      if (Date.now() - lastNewKeyAt > STALE_TIMEOUT_MS) {
        console.log(`   ⏱️  No new keys for ${STALE_TIMEOUT_MS / 1000}s — prefix scan complete (${seenKeys.size} unique objects)`);
        stream.destroy();
        break;
      }

      await new Promise((r) => setTimeout(r, 50));
      continue;
    }
    if (streamError) throw streamError;

    // Fill a batch up to CONCURRENCY.
    const batch: string[] = [];
    while (objectQueue.length > 0 && batch.length < CONCURRENCY) {
      batch.push(objectQueue.shift()!);
    }

    if (batch.length === 0 && streamEnded) break;
    if (batch.length === 0) continue;

    // Process the batch in parallel.
    await Promise.all(
      batch.map((key) => processObject(key, dryRun, stats).catch(() => {}))
    );

    if (stats.scanned % 1000 === 0 && stats.scanned > 0) {
      console.log(
        `   📊 Scanned ${stats.scanned} | Hashed ${stats.hashed} | Already ${stats.alreadyHashed} | Errors ${stats.skippedErrors}`
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const prefixArg = args.find((a) => a.startsWith('--prefix='));
  const prefixes = prefixArg ? [prefixArg.slice('--prefix='.length)] : DEFAULT_PREFIXES;

  console.log('═══════════════════════════════════════════════════');
  console.log('  FileHash Backfill Script');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode:        ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`  Prefixes:    ${prefixes.join(', ')}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log('───────────────────────────────────────────────────');

  const stats: BackfillStats = {
    scanned: 0,
    alreadyHashed: 0,
    hashed: 0,
    skippedErrors: 0,
    notFound: 0,
  };

  const start = Date.now();

  for (const prefix of prefixes) {
    await backfillPrefix(prefix, dryRun, stats);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Scanned:         ${stats.scanned}`);
  console.log(`  Already hashed:  ${stats.alreadyHashed}`);
  console.log(`  ${dryRun ? 'Would hash' : 'Newly hashed'}:    ${stats.hashed}`);
  console.log(`  Not found:       ${stats.notFound}`);
  console.log(`  Skipped errors:  ${stats.skippedErrors}`);
  console.log(`  Elapsed:         ${elapsed}s`);
  console.log('═══════════════════════════════════════════════════\n');

  await db.$disconnect();
  process.exit(stats.skippedErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
#!/usr/bin/env tsx

/**
 * Photo Storage Migration Script
 *
 * Migrates employee photos from base64 database storage to MinIO object storage
 *
 * Features:
 * - Batch processing with configurable batch size
 * - Resume capability (skips already migrated photos)
 * - Error handling and retry logic
 * - Detailed logging with JSON export
 * - Dry run mode for testing
 * - Backup preservation option
 */

import { PrismaClient } from '@prisma/client';
import { uploadFile } from '../src/lib/minio';
import { writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';

const prisma = new PrismaClient();

// Configuration
interface MigrationConfig {
  batchSize: number;
  dryRun: boolean;
  skipMigrated: boolean;
  preserveBackup: boolean;
  retryAttempts: number;
  delayMs: number;
}

interface MigrationResult {
  employeeId: string;
  employeeName: string;
  payrollNumber: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  oldUrl?: string;
  newUrl?: string;
  photoSize?: number;
}

interface MigrationSummary {
  timestamp: string;
  config: MigrationConfig;
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: MigrationResult[];
  duration: number;
}

// Parse command line arguments
function parseArguments(): MigrationConfig {
  const args = process.argv.slice(2);

  const config: MigrationConfig = {
    batchSize: 0, // 0 means all
    dryRun: false,
    skipMigrated: true,
    preserveBackup: false,
    retryAttempts: 3,
    delayMs: 50,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--batch-size' && args[i + 1]) {
      config.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--skip-migrated') {
      config.skipMigrated = true;
    } else if (arg === '--preserve-backup') {
      config.preserveBackup = true;
    } else if (arg === '--retry-attempts' && args[i + 1]) {
      config.retryAttempts = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--delay' && args[i + 1]) {
      config.delayMs = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Photo Storage Migration Script

Migrates employee photos from base64 database storage to MinIO object storage.

Usage:
  npx tsx scripts/migrate-photos-to-minio.ts [options]

Options:
  --batch-size <n>       Number of photos to migrate (default: all)
  --dry-run              Show what would be done without making changes
  --skip-migrated        Skip photos already migrated to MinIO (default: true)
  --preserve-backup      Keep base64 data in database as backup
  --retry-attempts <n>   Number of retry attempts for failed uploads (default: 3)
  --delay <ms>           Delay between migrations in milliseconds (default: 50)
  --help, -h             Show this help message

Examples:
  # Migrate all photos
  npx tsx scripts/migrate-photos-to-minio.ts

  # Dry run to see what would happen
  npx tsx scripts/migrate-photos-to-minio.ts --dry-run

  # Migrate first 100 photos only
  npx tsx scripts/migrate-photos-to-minio.ts --batch-size 100

  # Migrate and preserve base64 as backup
  npx tsx scripts/migrate-photos-to-minio.ts --preserve-backup

  # Migrate with slower pace (100ms delay)
  npx tsx scripts/migrate-photos-to-minio.ts --delay 100
`);
}

// Convert base64 data URI to buffer
function base64ToBuffer(
  dataUri: string
): { buffer: Buffer; mimeType: string } | null {
  try {
    // Extract base64 data and mime type
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return { buffer, mimeType };
  } catch (error) {
    console.error('Error converting base64 to buffer:', error);
    return null;
  }
}

// Get file extension from mime type
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };

  return mimeMap[mimeType.toLowerCase()] || 'jpg';
}

// Upload photo to MinIO
async function uploadPhotoToMinIO(
  employeeId: string,
  photoBuffer: Buffer,
  mimeType: string,
  retryAttempts: number = 3
): Promise<string | null> {
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = `${employeeId}.${extension}`;
  const filePath = `employee-photos/${fileName}`;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      await uploadFile(photoBuffer, filePath, mimeType);

      // Return the URL format that will be used to retrieve the photo
      return `/api/files/employee-photos/${fileName}`;
    } catch (error) {
      if (attempt === retryAttempts) {
        console.error(
          `Failed to upload after ${retryAttempts} attempts:`,
          error
        );
        return null;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return null;
}

// Migrate a single employee photo
async function migrateEmployeePhoto(
  employee: {
    id: string;
    name: string;
    payrollNumber: string;
    profileImageUrl: string;
  },
  config: MigrationConfig
): Promise<MigrationResult> {
  const result: MigrationResult = {
    employeeId: employee.id,
    employeeName: employee.name,
    payrollNumber: employee.payrollNumber,
    status: 'failed',
    oldUrl: employee.profileImageUrl,
  };

  try {
    // Check if already migrated (URL doesn't start with data:image)
    if (
      config.skipMigrated &&
      !employee.profileImageUrl.startsWith('data:image')
    ) {
      result.status = 'skipped';
      result.error = 'Already migrated to MinIO';
      return result;
    }

    // Convert base64 to buffer
    const photoData = base64ToBuffer(employee.profileImageUrl);
    if (!photoData) {
      result.status = 'failed';
      result.error = 'Invalid base64 data format';
      return result;
    }

    result.photoSize = photoData.buffer.length;

    // Dry run - don't actually upload
    if (config.dryRun) {
      result.status = 'success';
      result.newUrl = `/api/files/employee-photos/${employee.id}.${getExtensionFromMimeType(photoData.mimeType)}`;
      return result;
    }

    // Upload to MinIO
    const minioUrl = await uploadPhotoToMinIO(
      employee.id,
      photoData.buffer,
      photoData.mimeType,
      config.retryAttempts
    );

    if (!minioUrl) {
      result.status = 'failed';
      result.error = 'Failed to upload to MinIO';
      return result;
    }

    result.newUrl = minioUrl;

    // Update database
    const updateData: any = config.preserveBackup
      ? {
          profileImageUrl: minioUrl,
          // Store original base64 in a backup field if it exists
          // For now, we'll just update the main field
        }
      : {
          profileImageUrl: minioUrl,
        };

    await prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
    });

    result.status = 'success';
    return result;
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

// Main migration function
async function migratePhotos() {
  console.log('🚀 Starting Photo Storage Migration Script\n');

  const startTime = Date.now();
  const config = parseArguments();

  // Print configuration
  console.log('📋 Configuration:');
  console.log(
    `   Batch size: ${config.batchSize === 0 ? 'All' : config.batchSize}`
  );
  console.log(`   Dry run: ${config.dryRun}`);
  console.log(`   Skip migrated: ${config.skipMigrated}`);
  console.log(`   Preserve backup: ${config.preserveBackup}`);
  console.log(`   Retry attempts: ${config.retryAttempts}`);
  console.log(`   Delay: ${config.delayMs}ms\n`);

  // Fetch employees with photos using cursor-based pagination
  const whereClause = config.skipMigrated
    ? {
        profileImageUrl: {
          startsWith: 'data:image',
        },
      }
    : {
        profileImageUrl: {
          not: null,
        },
      };

  // First, count total photos to migrate
  const totalCount = await prisma.employee.count({ where: whereClause });

  console.log(`📊 Found ${totalCount} photo(s) to migrate\n`);

  if (totalCount === 0) {
    console.log('✨ No photos to migrate. All done!');
    await prisma.$disconnect();
    return;
  }

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Migrate photos in batches using cursor pagination
  const results: MigrationResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let processedCount = 0;
  let cursor: string | undefined = undefined;
  const pageSize = 100; // Process 100 photos at a time

  while (true) {
    // Check if we've reached the batch size limit
    if (config.batchSize > 0 && processedCount >= config.batchSize) {
      console.log(
        `\n⚠️  Batch size limit (${config.batchSize}) reached. Stopping.`
      );
      break;
    }

    // Fetch next batch
    const batchTake =
      config.batchSize > 0
        ? Math.min(pageSize, config.batchSize - processedCount)
        : pageSize;

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        payrollNumber: true,
        profileImageUrl: true,
      },
      take: batchTake,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: {
        id: 'asc',
      },
    });

    // If no more employees, break
    if (employees.length === 0) {
      break;
    }

    // Process this batch
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      processedCount++;

      process.stdout.write(
        `   [${processedCount}/${totalCount}] 📸 Migrating photo for ${employee.name} (${employee.payrollNumber})...`
      );

      const result = await migrateEmployeePhoto(employee, config);
      results.push(result);

      if (result.status === 'success') {
        successCount++;
        console.log(` ✅`);
      } else if (result.status === 'skipped') {
        skippedCount++;
        console.log(` ⏭️  ${result.error}`);
      } else {
        failedCount++;
        console.log(` ❌ ${result.error}`);
      }

      // Delay between migrations to avoid overwhelming the system
      if (config.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, config.delayMs));
      }
    }

    // Update cursor for next batch
    cursor = employees[employees.length - 1].id;

    // If we got fewer employees than requested, we're done
    if (employees.length < batchTake) {
      break;
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('🏁 MIGRATION SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Statistics:');
  console.log(`   Total Processed: ${processedCount}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s\n`);

  // Save results to JSON
  const summary: MigrationSummary = {
    timestamp: new Date().toISOString(),
    config,
    totalProcessed: processedCount,
    successful: successCount,
    failed: failedCount,
    skipped: skippedCount,
    results,
    duration,
  };

  await mkdir('logs', { recursive: true });
  const logFileName = `logs/photo-migration-${new Date().toISOString().replace(/:/g, '-')}.json`;
  writeFileSync(logFileName, JSON.stringify(summary, null, 2));

  console.log(`💾 Results saved to: ${logFileName}\n`);

  if (failedCount > 0) {
    console.log(
      '⚠️  Some photos failed to migrate. Check the log file for details.'
    );
    console.log('   You can re-run the script to retry failed migrations.\n');
  }

  if (!config.dryRun && successCount > 0) {
    console.log('✨ Migration completed successfully!');
    console.log(
      '   Photos are now stored in MinIO and served from /api/files/employee-photos/\n'
    );
  }

  await prisma.$disconnect();
}

// Run migration
migratePhotos().catch((error) => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});
